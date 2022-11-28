/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    includeSource: ['src/**/*.test.{ts, tsx}'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'], // to do prior task before all of your tests run
    coverage: {
      reporter: ['text', 'json', 'html'],
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
    },
  },
});
