import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerScoringRoutes } from './routes.js';
import { ScoringJobManager } from './job-manager.js';

let app: FastifyInstance;
let jobManager: ScoringJobManager;

const validBody = {
  reference: { name: 'ref.fasta', content: '>ref\nATCG', format: 'fasta' },
  assembly: { name: 'assembly.fasta', content: '>contig1\nGCTA', format: 'fasta' },
};

beforeEach(async () => {
  app = Fastify({ logger: false });
  jobManager = new ScoringJobManager({
    binaryDir: '/usr/local/bin',
    workDir: '/tmp/scoring-test',
    maxConcurrent: 1,
  });
  registerScoringRoutes(app, jobManager);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

// ---------------------------------------------------------------------------
// POST /api/score
// ---------------------------------------------------------------------------

describe('POST /api/score', () => {
  it('returns 400 when reference is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: { assembly: validBody.assembly },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/reference/i);
  });

  it('returns 400 when assembly is missing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: { reference: validBody.reference },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/assembly/i);
  });

  it('returns 400 when reference format is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: {
        ...validBody,
        reference: { ...validBody.reference, format: 'embl' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/fasta or genbank/i);
  });

  it('returns 400 when assembly format is invalid', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: {
        ...validBody,
        assembly: { ...validBody.assembly, format: 'xyz' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/fasta or genbank/i);
  });

  it('returns 400 when reference name is empty', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: {
        ...validBody,
        reference: { ...validBody.reference, name: '' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/reference/i);
  });

  it('returns 400 when options.weight is non-positive', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: { ...validBody, options: { weight: -1 } },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/weight/i);
  });

  it('returns 400 when options is not an object', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: { ...validBody, options: 'invalid' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/options/i);
  });

  it('returns 201 with jobId for valid minimal request', async () => {
    vi.spyOn(jobManager, 'submit').mockResolvedValue('test-score-id');

    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: validBody,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ jobId: 'test-score-id', status: 'queued' });
  });

  it('accepts request with valid options', async () => {
    vi.spyOn(jobManager, 'submit').mockResolvedValue('id');

    const response = await app.inject({
      method: 'POST',
      url: '/api/score',
      payload: {
        ...validBody,
        options: { batch: true, noCds: false, skipRefinement: true, weight: 200 },
      },
    });

    expect(response.statusCode).toBe(201);
  });
});

// ---------------------------------------------------------------------------
// GET /api/score/:jobId/status
// ---------------------------------------------------------------------------

describe('GET /api/score/:jobId/status', () => {
  it('returns 404 for unknown job', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/score/unknown-id/status',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toMatch(/not found/i);
  });

  it('returns job status for known job', async () => {
    vi.spyOn(jobManager, 'getStatus').mockReturnValue({
      jobId: 'abc-123',
      status: 'running',
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/score/abc-123/status',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ jobId: 'abc-123', status: 'running' });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/score/:jobId
// ---------------------------------------------------------------------------

describe('DELETE /api/score/:jobId', () => {
  it('returns 409 when job cannot be cancelled', async () => {
    vi.spyOn(jobManager, 'cancel').mockReturnValue(false);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/score/abc-123',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().error).toMatch(/cannot be cancelled/i);
  });

  it('returns 204 on successful cancellation', async () => {
    vi.spyOn(jobManager, 'cancel').mockReturnValue(true);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/score/abc-123',
    });

    expect(response.statusCode).toBe(204);
  });
});

// ---------------------------------------------------------------------------
// GET /api/score/:jobId/result
// ---------------------------------------------------------------------------

describe('GET /api/score/:jobId/result', () => {
  it('returns 404 when result is not available', async () => {
    vi.spyOn(jobManager, 'getResult').mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'GET',
      url: '/api/score/abc-123/result',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json().error).toMatch(/not available/i);
  });

  it('returns scoring result when job is completed', async () => {
    const mockResult = { alignment: '#FormatVersion Mauve1\n' };
    vi.spyOn(jobManager, 'getResult').mockResolvedValue(mockResult);

    const response = await app.inject({
      method: 'GET',
      url: '/api/score/abc-123/result',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockResult);
  });
});
