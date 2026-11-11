import { defineConfig } from 'vite';

// Development playground for the circus-rs browser library.
// `pnpm -F @utrad-ical/circus-rs demo` starts this together with
// a standalone RS server; leave the "Server" box empty to use it via the proxy.
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
    // The standalone RS server (`demo:server`) is available as `/rs`
    proxy: {
      '/rs': {
        target: process.env.RS_SERVER || 'http://localhost:3000',
        rewrite: path => path.replace(/^\/rs/, ''),
        ws: true
      }
    }
  }
});
