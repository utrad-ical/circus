# CIRCUS RS: DICOM Server and Viewer

CIRCUS RS consists of two parts:

- **RS server** (`src/server`): Serves DICOM series as metadata, images and volumes (HTTP and WebSocket).
  It is used by the CIRCUS API server, but can also run on its own.
- **Browser library** (`src/browser`): The viewer (`Viewer`, image sources, annotations, tools, etc.) that talks to an RS server.

## Standalone RS Server

```bash
pnpm -F @utrad-ical/circus-rs start
```

The server listens on port 3000 and reads DICOM files from `/var/circus/data/dicom` by default.
Override the options in `circus.config.js` (see [`config/default.js`](./config/default.js)).

## Demo

The demo is a playground for the browser library, which uses the sources directly.

```bash
pnpm -F @utrad-ical/circus-rs demo
```

This starts a standalone RS server (port 3000, restarted on changes) and the Vite dev server for [`demo/`](./demo) (port 8082) together.
Open http://localhost:8082/, enter a series instance UID, leave the "Server" box empty (the demo proxies `/rs` to the RS server), choose an example and click "Run".

The ports can be changed with environment variables:

```bash
RS_DEMO_PORT=18082 RS_SERVER=http://localhost:13000 pnpm -F @utrad-ical/circus-rs demo
```

`RS_SERVER` only changes the proxy target; the port of the RS server itself is set in `circus.config.js`.
