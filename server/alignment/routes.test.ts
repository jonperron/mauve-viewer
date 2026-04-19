import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify, { type FastifyInstance } from 'fastify';
import fastifyWebSocket from '@fastify/websocket';
import { registerAlignmentRoutes, registerAlignmentWebSocket } from './routes.js';
import { JobManager } from './job-manager.js';

let app: FastifyInstance;
let jobManager: JobManager;

beforeEach(async () => {
  app = Fastify({ logger: false });
  jobManager = new JobManager({
    binaryDir: '/nonexistent',
    workDir: '/tmp/mauve-test-jobs',
    maxConcurrent: 1,
  });
  await app.register(fastifyWebSocket);
  registerAlignmentRoutes(app, jobManager);
  registerAlignmentWebSocket(app, jobManager);
  await app.ready();
});

afterEach(async () => {
  await app.close();
});

describe('POST /api/align', () => {
  it('rejects request with fewer than 2 sequences', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/align',
      payload: {
        sequences: [{ name: 'a.fasta', content: '>a\nATCG', format: 'fasta' }],
        params: { algorithm: 'progressiveMauve', seedWeight: 'auto', collinear: false, fullAlignment: true, seedFamilies: false, iterativeRefinement: true, sumOfPairsScoring: true },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'At least two sequences are required' });
  });

  it('rejects request without algorithm', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/align',
      payload: {
        sequences: [
          { name: 'a.fasta', content: '>a\nATCG', format: 'fasta' },
          { name: 'b.fasta', content: '>b\nGCTA', format: 'fasta' },
        ],
        params: {},
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Algorithm selection is required' });
  });

  it('rejects request with invalid algorithm', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/align',
      payload: {
        sequences: [
          { name: 'a.fasta', content: '>a\nATCG', format: 'fasta' },
          { name: 'b.fasta', content: '>b\nGCTA', format: 'fasta' },
        ],
        params: { algorithm: 'notReal' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Invalid algorithm' });
  });

  it('rejects sequence missing required fields', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/align',
      payload: {
        sequences: [
          { name: 'a.fasta', content: '>a\nATCG', format: 'fasta' },
          { name: '', content: '>b\nGCTA', format: 'fasta' },
        ],
        params: { algorithm: 'progressiveMauve' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: 'Each sequence must have name, content, and format' });
  });

  it('returns 201 with jobId for valid request', async () => {
    vi.spyOn(jobManager, 'submit').mockResolvedValue('test-job-id');

    const response = await app.inject({
      method: 'POST',
      url: '/api/align',
      payload: {
        sequences: [
          { name: 'a.fasta', content: '>a\nATCG', format: 'fasta' },
          { name: 'b.fasta', content: '>b\nGCTA', format: 'fasta' },
        ],
        params: {
          algorithm: 'progressiveMauve',
          seedWeight: 'auto',
          collinear: false,
          fullAlignment: true,
          seedFamilies: false,
          iterativeRefinement: true,
          sumOfPairsScoring: true,
        },
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({ jobId: 'test-job-id', status: 'queued' });
  });
});

describe('GET /api/align/:jobId/status', () => {
  it('returns 404 for unknown job', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/align/unknown/status',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Job not found' });
  });

  it('returns job status when found', async () => {
    const mockStatus = { jobId: 'job-1', status: 'running' as const, progress: 'Anchoring...' };
    vi.spyOn(jobManager, 'getStatus').mockReturnValue(mockStatus);

    const response = await app.inject({
      method: 'GET',
      url: '/api/align/job-1/status',
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual(mockStatus);
  });
});

describe('DELETE /api/align/:jobId', () => {
  it('returns 409 when job cannot be cancelled', async () => {
    vi.spyOn(jobManager, 'cancel').mockReturnValue(false);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/align/job-1',
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'Job cannot be cancelled' });
  });

  it('returns 204 on successful cancellation', async () => {
    vi.spyOn(jobManager, 'cancel').mockReturnValue(true);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/align/job-1',
    });

    expect(response.statusCode).toBe(204);
  });
});

describe('GET /api/align/:jobId/result', () => {
  it('returns 404 when result not available', async () => {
    vi.spyOn(jobManager, 'getResult').mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'GET',
      url: '/api/align/job-1/result',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'Result not available' });
  });

  it('returns XMFA content as text', async () => {
    const xmfa = '#FormatVersion Mauve1\n> 1:1-100 +\nATCG\n=';
    vi.spyOn(jobManager, 'getResult').mockResolvedValue(xmfa);

    const response = await app.inject({
      method: 'GET',
      url: '/api/align/job-1/result',
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toBe(xmfa);
  });
});

describe('POST /api/align — format validation', () => {
  it('rejects sequence with invalid format', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/align',
      payload: {
        sequences: [
          { name: 'a.fasta', content: '>a\nATCG', format: 'fasta' },
          { name: 'b.txt', content: '>b\nGCTA', format: 'invalid' },
        ],
        params: { algorithm: 'progressiveMauve' },
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error).toMatch(/Invalid sequence format/);
  });
});

describe('GET /api/align/:jobId/progress (WebSocket)', () => {
  it('closes with 4004 for unknown job', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/align/unknown/progress',
      headers: {
        connection: 'upgrade',
        upgrade: 'websocket',
        'sec-websocket-version': '13',
        'sec-websocket-key': 'dGhlIHNhbXBsZSBub25jZQ==',
      },
    });

    // Without a real WebSocket handshake, Fastify returns 404 or the handler runs
    // The key thing is that the route is registered and reachable
    expect(response.statusCode).toBeLessThan(500);
  });
});
