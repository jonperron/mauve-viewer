import Fastify, { type FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';

export interface ServerOptions {
  readonly logger: boolean;
  readonly staticRoot: string;
}

export function buildApp(options: ServerOptions): FastifyInstance {
  const app = Fastify({ logger: options.logger });

  app.register(fastifyStatic, {
    root: options.staticRoot,
    prefix: '/',
  });

  app.get('/api/health', async () => ({ status: 'ok' }));

  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.status(404).send({ error: 'Not found' });
    }
    await reply.status(200).sendFile('index.html');
  });

  return app;
}
