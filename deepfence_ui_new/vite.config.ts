/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    includeSource: ['src/**/*.{ts, tsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'], // to do prior task before all of your tests run
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
