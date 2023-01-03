/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, '.');
  return {
    plugins: [react(), ...(mode === 'production' ? [visualizer()] : [])],
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
      host: true,
      port: 5050,
      proxy: {
        '^/deepfence/.*': {
          target: viteEnv.VITE_DEV_API_BASE_URL,
          changeOrigin: true,
          secure: false,
          proxyTimeout: 5000,
        },
      },
    },
  };
});
