import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./Tests/vitest.setup.js'], // Load mocks before tests
    globals: true,
    environment: 'jsdom',
    include: ['Tests/**'],   // include all test files here
    exclude: [
      '**/node_modules/**',
      'FrontEnd/Cesium-1.135/**',               // exclude any tests we didnt make
      '**/dist/**',
      '**/Tests/vitest.setup.js'  // exclude the setup file itself
    ],
  },
});