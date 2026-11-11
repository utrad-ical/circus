# CIRCUS

This is a monorepo that contains all CIRCUS projects.

- **circus-api**: JSON-based REST API server
- **circus-web-ui**: Front-end code for CIRCUS web UI
- **circus-rs**: Web-based DICOM viewer with 3D annotation capability
- **circus-cs-core**: Includes job manager daemon and CS related code
- **circus-icons**: Icons used by CIRCUS projects
- **circus-ui-kit**: Includes React-bindings of CIRCUS RS and displays for CS results display
- **circus-lib**: Code shared among the above projects

## Install

The easiest way to get CIRCUS working is to use Docker Compose.
CIRCUS consists of the following containers:

| Service | Image                           | Description                                              |
| ------- | ------------------------------- | -------------------------------------------------------- |
| `mongo` | `mongo:9.0`                     | MongoDB (replica set `rs0`)                              |
| `api`   | `ghcr.io/utrad-ical/circus-api` | API server, CIRCUS RS, and CS job manager                |
| `web`   | `ghcr.io/utrad-ical/circus-web` | Web UI served by Caddy, proxying `/api`, `/login`, `/rs` |

Each service belongs to a profile of the same name, so you can start any combination of them
(e.g., run only `mongo` in Docker while developing the API server locally).
See [`compose.yaml`](./compose.yaml) for the available environment variables.

```bash
# Build the images locally and start everything
COMPOSE_PROFILES=mongo,api,web docker compose up -d --build

# Initialize (or upgrade) the database
docker compose exec api circus migrate

# Register a CAD plug-in (Docker image ID without the "sha256:" prefix)
docker compose exec api circus register-cad-plugin <PLUGIN_ID>
```

`circus` is the administration command of the `api` container; run `docker compose exec api circus` to see all the available commands.
When developing CIRCUS locally, use `pnpm circus` instead (e.g., `pnpm circus migrate`).

The default user is `circus` (password: `circus`).

To use your own configuration, mount your `circus.config.js` at `/var/circus/circus.config.js` in the `api` container
(the default one is [`docker/api/circus.config.js`](./docker/api/circus.config.js)).

**Follow the instruction below only when you want to install CIRCUS manually or develop CIRCUS itself.**

### Install Requirements

- Node.js (&ge; 24.x)
- [pnpm](https://pnpm.io/) (the version is pinned by `packageManager` in `package.json`; with [Corepack](https://github.com/nodejs/corepack) it is selected automatically)
- Docker
- MongoDB

### Install JavaScript Dependencies

We use [pnpm workspaces](https://pnpm.io/workspaces) to manage the monorepo:

```
git clone git@github.com:utrad-ical/circus
cd circus
pnpm install
```

Packages in this repository depend on each other via `workspace:*`.
Unlike npm, pnpm does not hoist dependencies, so each package must declare every package it imports in its own `package.json`.

### Automated Test, Lint & Code Formatting:

```bash
pnpm test
pnpm run lint-format # or `pnpm run format` to fix (oxfmt)
pnpm run lint
pnpm run typecheck
```

### Development Server

```bash
pnpm dev
```

This starts the following two in parallel. Each output line is prefixed with the package name, and Ctrl+C stops both.

- API server (`packages/circus-api`, port 8080). It runs with `node --watch`, so it restarts when an imported source file (including those in other packages such as circus-lib and circus-rs) changes.
- Web UI dev server (`packages/circus-web-ui`, port 8081). It proxies `/api`, `/login` and `/rs` (including the WebSocket `/rs/ws`) to the API server.

The ports and the proxy target can be changed with environment variables:

```bash
PORT=18080 CIRCUS_PORT=18081 DEV_PROXY=http://localhost:18080 pnpm dev
```

You can also start only one of them with `pnpm -F @utrad-ical/circus-api dev` or `pnpm -F @utrad-ical/circus-web-ui dev`.

To develop the viewer of CIRCUS RS without CIRCUS itself, use the RS demo (see [`packages/circus-rs/README.md`](./packages/circus-rs/README.md)):

```bash
pnpm -F @utrad-ical/circus-rs demo
```

### Configuration

We use [cosmiconfig](https://github.com/davidtheclark/cosmiconfig) to configure options across all CIRCUS packages.

The config file `circus.config.js` (or other supported file) will be searched
from this directory up to your home directory. This is consumed by ServiceLoader, a tiny DI container.

The content of this file would look like this:

```js
module.exports = {
  // service name (interface)
  dicomFileRepository: {
    type: 'StaticDicomFileRepository', // module (implementation)
    options: { dataDir: '/var/circus/data/dicom', useHash: false }
  }
};
```

Sees `packages/*/src/config/default.ts` for the available options and defaults.

## Production Build

Use this to build optimized production builds (slow). This is not necessary while you are developing CIRCUS.

```bash
# On monorepo root: builds the npm packages (circus-lib, circus-rs and
# circus-ui-kit, with tsdown into `dist/`) and the web UI (Vite, into `packages/circus-web-ui/dist/`)
pnpm run build

# The Docker image only needs the web UI;
# the server runs the TypeScript sources directly
pnpm -F @utrad-ical/circus-web-ui run build
```

TypeScript (`tsc`) is used only for type checking (`pnpm run typecheck`).
