import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['test/vitest/**/*.test.js'],
    globals: true,
    api: {
      port: 3006,
      host: '127.0.0.1'
    }
  }
});
