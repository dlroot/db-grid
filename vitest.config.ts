import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.spec.ts'],
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        'src/test.ts',
        'src/main.ts',
      ],
    },
  },
  ...viteConfig,
});