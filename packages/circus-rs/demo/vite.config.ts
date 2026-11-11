import { defineConfig } from 'vite';

// Development playground for the circus-rs browser library.
// Run `pnpm -F @utrad-ical/circus-rs demo` and open the printed URL.
// Start a standalone RS server, too, and leave the "Server" box empty
// to use it via the proxy.
export default defineConfig({
  root: import.meta.dirname,
  resolve: {
    // `circus-rs.less` uses the webpack-style `~` prefix in `url()`,
    // which is kept for the published CSS
    alias: [{ find: /^~(.+)/, replacement: '$1' }]
  },
  server: {
    port: Number(process.env.RS_DEMO_PORT) || 8082,
    strictPort: true,
    // A standalone RS server (`pnpm -F @utrad-ical/circus-rs start`)
    // is available as `/rs` on this origin
    proxy: {
      '/rs': {
        target: process.env.RS_SERVER || 'http://localhost:3000',
        rewrite: path => path.replace(/^\/rs/, ''),
        ws: true
      }
    }
  }
});
