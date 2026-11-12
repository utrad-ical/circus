import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import svgIconPlugin from './vite/svgIconPlugin.ts';

const proxyTarget = process.env.DEV_PROXY || 'http://localhost:8080';

export default defineConfig({
  plugins: [react(), svgIconPlugin()],
  // Nothing to copy as-is; everything is bundled from `index.html`
  publicDir: false,
  build: {
    sourcemap: true,
    // The oldest browser versions that support every CSS feature we use
    // (as of 2026-11, `contrast-color()` sets the bar). Raise them when using
    // a newer feature. Do not lower them: the minifier would then rewrite
    // `light-dark()` into a polyfill that does not work with `color-scheme`
    // set from JS
    cssTarget: ['chrome147', 'edge147', 'firefox146', 'safari26']
  },
  optimizeDeps: {
    // rb-components is published as .tsx sources, which Vite does not
    // pre-bundle by itself; its CommonJS dependencies (e.g., `invariant`,
    // `react-bootstrap/lib/*`) would then be served as-is and fail to load
    extensions: ['.ts', '.tsx'],
    include: ['@smikitky/rb-components/lib/*.tsx']
  },
  worker: {
    format: 'es'
  },
  server: {
    port: Number(process.env.CIRCUS_PORT) || 8081,
    strictPort: true,
    proxy: {
      '/api': proxyTarget,
      '/login': proxyTarget,
      '/rs': { target: proxyTarget, ws: true, changeOrigin: true }
    }
  }
});
