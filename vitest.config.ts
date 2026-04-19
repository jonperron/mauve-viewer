import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts', 'tests/**/*.test.{js,ts}'],
    environment: 'jsdom',
    environmentMatchGlobs: [
      ['server/**/*.test.ts', 'node'],
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'server/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'server/**/*.test.ts', 'src/main.ts', 'server/index.ts'],
    },
  },
});
