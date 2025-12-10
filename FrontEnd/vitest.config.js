import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    exclude: [
      '**/node_modules/**',
      '**/Cesium-1.135/Specs/e2e/**',  // Exclude Playwright e2e tests
      '**/dist/**',
    ],
  },
});