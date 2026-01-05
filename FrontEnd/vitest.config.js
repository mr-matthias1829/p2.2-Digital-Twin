import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./Tests/vitest.setup.js'], // Load default mocks before tests
    globals: true,
    environment: 'jsdom',
    include: ['Tests/**'],   // include all test files here
    exclude: [
      '**/node_modules/**',
      'FrontEnd/Cesium-1.135/**',               // exclude any tests we didnt make
      '**/dist/**',
      '**/Tests/vitest.setup.js',  // exclude the setup file itself
      '**/Tests/Mocks/**'  // exclude files that can be used to mock specific's
    ],
  },
});