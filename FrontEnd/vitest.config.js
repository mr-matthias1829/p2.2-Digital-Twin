import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['Tests/**'],   // include all test files here
    exclude: [
      '**/node_modules/**',
      'FrontEnd/Cesium-1.135/**',               // exclude any tests we didnt make
      '**/dist/**',
    ],
  },
});