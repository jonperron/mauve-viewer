import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebSocket from '@fastify/websocket';
import { JobManager, type JobManagerConfig } from './alignment/job-manager.js';
import {
  registerAlignmentRoutes,
  registerAlignmentWebSocket,
} from './alignment/routes.js';
import { ReorderJobManager, type ReorderJobManagerConfig } from './contig-reorder/job-manager.js';
import { registerReorderRoutes } from './contig-reorder/routes.js';

export interface ServerOptions {
  readonly logger: boolean;
  readonly staticRoot: string;
  readonly alignment?: JobManagerConfig;
  readonly contigReorder?: ReorderJobManagerConfig;
}

export function buildApp(options: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger });

  app.register(fastifyStatic, {
    root: options.staticRoot,
    prefix: '/',
  });

  app.get('/api/health', async () => ({ status: 'ok' }));

  if (options.alignment) {
    app.register(fastifyWebSocket);
    const jobManager = new JobManager(options.alignment);
    registerAlignmentRoutes(app, jobManager);
    app.after(() => {
      registerAlignmentWebSocket(app, jobManager);
    });
  }

  if (options.contigReorder) {
    const reorderManager = new ReorderJobManager(options.contigReorder);
    registerReorderRoutes(app, reorderManager);
  }

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    await reply.status(200).sendFile('index.html');
  });

  return app;
}
