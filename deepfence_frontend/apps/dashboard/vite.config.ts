/// <reference types="vitest" />
/// <reference types="vite/client" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import { configDefaults } from 'vitest/config';
import webfontDownload from 'vite-plugin-webfont-dl';

const current = fileURLToPath(import.meta.url);
const root = path.dirname(current);

const matomoPlugin = (enable: string) => {
  if (enable?.trim() === 'true') {
    return {
      name: 'analytics-tracking',
      transformIndexHtml(html) {
        return html.replace(
          /<analytics-tracking>(.*?)<\/analytics-tracking>/,
          `<script>
          var _paq = (window._paq = window._paq || []);
          /* tracker methods like "setCustomDimension" should be called before "trackPageView" */
          _paq.push(['trackPageView']);
          _paq.push(['enableLinkTracking']);
          (function () {
            var u = '//analytics.deepfence.io/';
            _paq.push(['setTrackerUrl', u + 'matomo.php']);
            _paq.push(['setSiteId', '1']);
            var d = document,
              g = d.createElement('script'),
              s = d.getElementsByTagName('script')[0];
            g.async = true;
            g.src = u + 'matomo.js';
            s.parentNode.insertBefore(g, s);
          })();
        </script>`,
        );
      },
    };
  }
  return {
    name: 'analytics-tracking',
    transformIndexHtml(html) {
      return html.replace(/<analytics-tracking>(.*?)<\/analytics-tracking>/, '');
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const viteEnv = loadEnv(mode, '.');
  return {
    plugins: [
      react(),
      webfontDownload(),
      matomoPlugin(process.env.ENABLE_ANALYTICS),
      ...(mode === 'production' ? [visualizer()] : []),
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
      // https://github.com/vitejs/vite/issues/5668
      commonjsOptions: {
        include: [/tailwind-preset/, /node_modules/],
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
          proxyTimeout: 300000,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(root, './src'),
      },
    },
  };
});
