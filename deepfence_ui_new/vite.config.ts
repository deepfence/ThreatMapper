/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, '.');
  return {
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
    server: {
      proxy: {
        '^/deepfence/v1.5/.*': {
          target: viteEnv.VITE_API_BASE_URL,
          changeOrigin: true,
          secure: false,
        },
        '^/topology-api/.*': {
          target: viteEnv.VITE_API_BASE_URL,
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
