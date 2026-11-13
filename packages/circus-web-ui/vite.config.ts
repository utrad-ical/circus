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
    // Minimum versions to support contrast-color() and anchor positioning
    cssTarget: ['chrome147', 'edge147', 'firefox147', 'safari26']
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
