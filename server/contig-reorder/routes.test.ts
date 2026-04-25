import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerReorderRoutes } from './routes.js';
import { ReorderJobManager } from './job-manager.js';

let app: FastifyInstance;
let jobManager: ReorderJobManager;

const validBody = {
  reference: { name: 'ref.fasta', content: '>ref\nATCG', format: 'fasta' },
  draft: { name: 'draft.fasta', content: '>draft\nGCTA', format: 'fasta' },
  maxIterations: 15,
};

beforeEach(async () => {
  app = Fastify({ logger: false });
  jobManager = new ReorderJobManager({
    jarPath: '/opt/mauve/Mauve.jar',
    workDir: '/tmp/reorder-test',
    maxConcurrent: 1,
  });
  registerReorderRoutes(app, jobManager);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe('POST /api/reorder', () => {
  it('returns 400 when reference is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reorder',
      payload: { draft: validBody.draft },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/reference/i);
  });

  it('returns 400 when draft is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reorder',
      payload: { reference: validBody.reference },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/draft/i);
  });

  it('returns 400 when reference format is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reorder',
      payload: {
        ...validBody,
        reference: { ...validBody.reference, format: 'embl' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/fasta or genbank/i);
  });

  it('returns 400 when draft format is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reorder',
      payload: {
        ...validBody,
        draft: { ...validBody.draft, format: 'xyz' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/fasta or genbank/i);
  });

  it('returns 400 when maxIterations is not a number', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/reorder',
      payload: { ...validBody, maxIterations: 'many' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/maxIterations/i);
  });

  it('returns 201 with jobId for valid request', async () => {
    vi.spyOn(jobManager, 'submit').mockResolvedValue('test-reorder-id');

    const response = await app.inject({
      method: 'POST',
      url: '/api/reorder',
      payload: validBody,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ jobId: 'test-reorder-id', status: 'queued' });
  });

  it('accepts maxIterations omitted (uses default)', async () => {
    vi.spyOn(jobManager, 'submit').mockResolvedValue('id');

    const response = await app.inject({
      method: 'POST',
      url: '/api/reorder',
      payload: { reference: validBody.reference, draft: validBody.draft },
    });

    expect(response.statusCode).toBe(201);
  });
});

describe('GET /api/reorder/:jobId/status', () => {
  it('returns 404 for unknown job', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/reorder/nonexistent/status',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Job not found' });
  });

  it('returns status with iteration fields for known job', async () => {
    vi.spyOn(jobManager, 'getStatus').mockReturnValue({
      jobId: 'abc',
      status: 'running',
      iteration: 2,
      maxIterations: 15,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reorder/abc/status',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      jobId: 'abc',
      status: 'running',
      iteration: 2,
      maxIterations: 15,
    });
  });
});

describe('DELETE /api/reorder/:jobId', () => {
  it('returns 409 when job cannot be cancelled', async () => {
    vi.spyOn(jobManager, 'cancel').mockReturnValue(false);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/reorder/some-job',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'Job cannot be cancelled' });
  });

  it('returns 204 on successful cancellation', async () => {
    vi.spyOn(jobManager, 'cancel').mockReturnValue(true);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/reorder/some-job',
    });

    expect(response.statusCode).toBe(204);
  });
});

describe('GET /api/reorder/:jobId/result', () => {
  it('returns 404 when result is not available', async () => {
    vi.spyOn(jobManager, 'getResult').mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'GET',
      url: '/api/reorder/some-job/result',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Result not available' });
  });

  it('returns reorder result as JSON', async () => {
    vi.spyOn(jobManager, 'getResult').mockResolvedValue({
      sequence: '>reordered\nATCG',
      contigsTab: 'Contigs to reverse:\ncontig1\n',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/reorder/some-job/result',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      sequence: '>reordered\nATCG',
      contigsTab: 'Contigs to reverse:\ncontig1\n',
    });
  });
});
