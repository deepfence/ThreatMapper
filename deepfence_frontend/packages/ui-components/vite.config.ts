/// <reference types="vitest" />

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, PluginOption, UserConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { configDefaults } from 'vitest/config';

import { peerDependencies } from './package.json';

const current = fileURLToPath(import.meta.url);
const root = path.dirname(current);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      dts({
        insertTypesEntry: true,
      }),
      ...(mode === 'production' ? [visualizer() as unknown as PluginOption] : []),
    ],
    test: {
      includeSource: ['src/**/*.test.{ts, tsx}'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.ts'], // to do prior task before all of your tests run
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
    optimizeDeps: {
      include: ['tailwind-preset'],
    },
    build: {
      sourcemap: true,
      lib: {
        entry: path.resolve(root, 'src/main.ts'),
        formats: ['es'],
        name: 'ui-components',
        fileName: (format) => `index.${format}.js`,
      },
      rollupOptions: {
        external: [...Object.keys(peerDependencies)],
      },
      // https://github.com/vitejs/vite/issues/5668
      commonjsOptions: {
        include: [/tailwind-preset/, /node_modules/],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(root, './src'),
      },
    },
  } satisfies UserConfig;
});
