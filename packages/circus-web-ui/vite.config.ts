import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const proxyTarget = process.env.DEV_PROXY || 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  // Nothing to copy as-is; everything is bundled from `index.html`
  publicDir: false,
  build: {
    sourcemap: true
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
