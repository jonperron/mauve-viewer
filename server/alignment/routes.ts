import type { FastifyInstance } from 'fastify';
import type { JobManager } from './job-manager.js';
import type { AlignmentRequest } from './types.js';

export function registerAlignmentRoutes(
  app: FastifyInstance,
  jobManager: JobManager,
): void {
  /** POST /api/align — Submit a new alignment job */
  app.post<{ Body: AlignmentRequest }>('/api/align', async (request, reply) => {
    const body = request.body;

    if (!body?.sequences || !Array.isArray(body.sequences) || body.sequences.length < 2) {
      return reply.status(400).send({ error: 'At least two sequences are required' });
    }

    if (!body.params?.algorithm) {
      return reply.status(400).send({ error: 'Algorithm selection is required' });
    }

    const validAlgorithms = ['mauveAligner', 'progressiveMauve'];
    if (!validAlgorithms.includes(body.params.algorithm)) {
      return reply.status(400).send({ error: 'Invalid algorithm' });
    }

    const validFormats = ['fasta', 'genbank', 'embl', 'raw'];
    for (const seq of body.sequences) {
      if (!seq.name || !seq.content || !seq.format) {
        return reply.status(400).send({ error: 'Each sequence must have name, content, and format' });
      }
      if (!validFormats.includes(seq.format)) {
        return reply.status(400).send({ error: `Invalid sequence format: ${seq.format}` });
      }
    }

    const jobId = await jobManager.submit(body);
    return reply.status(201).send({ jobId, status: 'queued' });
  });

  /** GET /api/align/:jobId/status — Get job status */
  app.get<{ Params: { jobId: string } }>(
    '/api/align/:jobId/status',
    async (request, reply) => {
      const status = jobManager.getStatus(request.params.jobId);
      if (!status) {
        return reply.status(404).send({ error: 'Job not found' });
      }
      return status;
    },
  );

  /** DELETE /api/align/:jobId — Cancel a running job */
  app.delete<{ Params: { jobId: string } }>(
    '/api/align/:jobId',
    async (request, reply) => {
      const cancelled = jobManager.cancel(request.params.jobId);
      if (!cancelled) {
        return reply.status(409).send({ error: 'Job cannot be cancelled' });
      }
      return reply.status(204).send();
    },
  );

  /** GET /api/align/:jobId/result — Download alignment result */
  app.get<{ Params: { jobId: string } }>(
    '/api/align/:jobId/result',
    async (request, reply) => {
      const result = await jobManager.getResult(request.params.jobId);
      if (result === undefined) {
        return reply.status(404).send({ error: 'Result not available' });
      }
      return reply
        .header('Content-Type', 'text/plain; charset=utf-8')
        .send(result);
    },
  );
}

/**
 * Registers the WebSocket progress endpoint.
 * Requires @fastify/websocket to be registered on the app.
 *
 * GET /api/align/:jobId/progress (WebSocket upgrade)
 */
export function registerAlignmentWebSocket(
  app: FastifyInstance,
  jobManager: JobManager,
): void {
  app.get<{ Params: { jobId: string } }>(
    '/api/align/:jobId/progress',
    { websocket: true },
    (socket, request) => {
      const { jobId } = request.params;
      const status = jobManager.getStatus(jobId);

      if (!status) {
        socket.close(4004, 'Job not found');
        return;
      }

      const listener = (event: { readonly jobId: string; readonly type: string; readonly message?: string }) => {
        try {
          socket.send(JSON.stringify(event));
        } catch {
          // Connection may have closed
        }

        if (event.type === 'completed' || event.type === 'failed' || event.type === 'cancelled') {
          socket.close(1000, event.type);
        }
      };

      jobManager.addProgressListener(jobId, listener);

      socket.on('close', () => {
        jobManager.removeProgressListener(jobId, listener);
      });
    },
  );
}
