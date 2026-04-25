import type { FastifyInstance } from 'fastify';
import type { ReorderJobManager } from './job-manager.js';
import type { ReorderRequest } from './types.js';

const VALID_FORMATS = new Set(['fasta', 'genbank']);

/** Maximum allowed sequence content size in bytes (10 MB) */
const MAX_SEQUENCE_BYTES = 10 * 1024 * 1024;

function validateSequenceInput(
  seq: unknown,
  label: string,
): string | null {
  if (!seq || typeof seq !== 'object') {
    return `${label}: must be an object`;
  }
  const s = seq as Record<string, unknown>;
  if (typeof s['name'] !== 'string' || !s['name']) {
    return `${label}: name is required`;
  }
  if (typeof s['content'] !== 'string' || !s['content']) {
    return `${label}: content is required`;
  }
  if (Buffer.byteLength(s['content'] as string, 'utf-8') > MAX_SEQUENCE_BYTES) {
    return `${label}: content exceeds maximum allowed size`;
  }
  if (typeof s['format'] !== 'string' || !VALID_FORMATS.has(s['format'])) {
    return `${label}: format must be fasta or genbank`;
  }
  return null;
}

export function registerReorderRoutes(
  app: FastifyInstance,
  jobManager: ReorderJobManager,
): void {
  /** POST /api/reorder — Submit a new contig reordering job */
  app.post<{ Body: ReorderRequest }>('/api/reorder', async (request, reply) => {
    const body = request.body;

    if (!body || typeof body !== 'object') {
      return reply.status(400).send({ error: 'Request body is required' });
    }

    const refError = validateSequenceInput(body.reference, 'reference');
    if (refError) {
      return reply.status(400).send({ error: refError });
    }

    const draftError = validateSequenceInput(body.draft, 'draft');
    if (draftError) {
      return reply.status(400).send({ error: draftError });
    }

    if (
      body.maxIterations !== undefined &&
      (typeof body.maxIterations !== 'number' || !Number.isFinite(body.maxIterations))
    ) {
      return reply.status(400).send({ error: 'maxIterations must be a number' });
    }

    const jobId = await jobManager.submit(body);
    return reply.status(201).send({ jobId, status: 'queued' });
  });

  /** GET /api/reorder/:jobId/status — Get job status with iteration count */
  app.get<{ Params: { jobId: string } }>(
    '/api/reorder/:jobId/status',
    async (request, reply) => {
      const status = jobManager.getStatus(request.params.jobId);
      if (!status) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      return status;
    },
  );

  /** DELETE /api/reorder/:jobId — Cancel a running or queued job */
  app.delete<{ Params: { jobId: string } }>(
    '/api/reorder/:jobId',
    async (request, reply) => {
      const cancelled = jobManager.cancel(request.params.jobId);
      if (!cancelled) {
        return reply.status(409).send({ error: 'Job cannot be cancelled' });
      }
      return reply.status(204).send();
    },
  );

  /** GET /api/reorder/:jobId/result — Download reordered output */
  app.get<{ Params: { jobId: string } }>(
    '/api/reorder/:jobId/result',
    async (request, reply) => {
      const result = await jobManager.getResult(request.params.jobId);
      if (result === undefined) {
        return reply.status(404).send({ error: 'Result not available' });
      }
      return reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .send(result);
    },
  );
}
