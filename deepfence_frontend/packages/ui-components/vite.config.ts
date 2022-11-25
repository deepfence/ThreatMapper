/// <reference types="vitest" />
/// <reference types="vite/client" />

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { configDefaults } from 'vitest/config';

const current = fileURLToPath(import.meta.url);
const root = path.dirname(current);

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react({
        jsxRuntime: 'classic',
      }),
      dts({
        insertTypesEntry: true,
      }),
    ],
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
    build: {
      lib: {
        entry: path.resolve(root, 'src/main.ts'),
        name: 'ui-components',
        fileName: (format) => `ui-components.${format}.js`,
      },
      rollupOptions: {
        external: ['react'],
        output: {
          globals: {
            react: 'React',
          },
        },
      },
    },
    sourcemap: true,
  };
});
