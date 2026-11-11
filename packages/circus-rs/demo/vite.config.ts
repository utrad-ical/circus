import { defineConfig } from 'vite';

// Development playground for the circus-rs browser library.
// Run `pnpm -F @utrad-ical/circus-rs demo` and open the printed URL.
export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    // `circus-rs.less` uses the webpack-style `~` prefix in `url()`,
    // which is kept for the published CSS
    alias: [{ find: /^~(.+)/, replacement: '$1' }]
  },
  server: {
    port: Number(process.env.RS_DEMO_PORT) || 8082,
    strictPort: true
  }
});
