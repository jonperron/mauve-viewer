import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildApp } from './app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new RangeError(`Invalid PORT: ${process.env.PORT}`);
}
const HOST = process.env.HOST ?? '0.0.0.0';
const STATIC_ROOT = process.env.STATIC_ROOT
  ?? resolve(__dirname, '..', 'public');

const app = buildApp({
  logger: true,
  staticRoot: STATIC_ROOT,
});

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
