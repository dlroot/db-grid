import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['projects/db-grid/src/lib/**/*.spec.ts'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'projects/db-grid/src/test.ts']
    }
  }
});
