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
const BINARY_DIR = process.env.MAUVE_BINARY_DIR ?? '/usr/local/bin';
const WORK_DIR = process.env.MAUVE_WORK_DIR
  ?? resolve(__dirname, '..', '.mauve-jobs');
const MAX_CONCURRENT = Number(process.env.MAUVE_MAX_CONCURRENT ?? 2);
if (!Number.isInteger(MAX_CONCURRENT) || MAX_CONCURRENT < 1) {
  throw new RangeError(`Invalid MAUVE_MAX_CONCURRENT: ${process.env.MAUVE_MAX_CONCURRENT}`);
}

const app = buildApp({
  logger: true,
  staticRoot: STATIC_ROOT,
  alignment: {
    binaryDir: BINARY_DIR,
    workDir: WORK_DIR,
    maxConcurrent: MAX_CONCURRENT,
  },
});

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
