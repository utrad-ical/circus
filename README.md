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
| `mongo` | `mongo:5.0.6`                   | MongoDB (replica set `rs0`)                              |
| `api`   | `ghcr.io/utrad-ical/circus-api` | API server, CIRCUS RS, and CS job manager                |
| `web`   | `ghcr.io/utrad-ical/circus-web` | Web UI served by Caddy, proxying `/api`, `/login`, `/rs` |

Each service belongs to a profile of the same name, so you can start any combination of them
(e.g., run only `mongo` in Docker while developing the API server locally).
See [`compose.yaml`](./compose.yaml) for the available environment variables.

```bash
# Build the images locally and start everything
COMPOSE_PROFILES=mongo,api,web docker compose up -d --build

# Initialize (or upgrade) the database
docker compose run --rm api node circus.js migrate

# Register a CAD plug-in (Docker image ID without the "sha256:" prefix)
docker compose run --rm api node circus.js register-cad-plugin <PLUGIN_ID>
```

The default user is `circus` (password: `circus`).

To use your own configuration, mount your `circus.config.js` at `/var/circus/circus.config.js` in the `api` container
(the default one is [`docker/api/circus.config.js`](./docker/api/circus.config.js)).

**Follow the instruction below only when you want to install CIRCUS manually or develop CIRCUS itself.**

### Install Requirements

- Node.js (&ge; 22.x) and NPM (**&ge; 10**)
- Docker
- MongoDB

### Install JavaScript Dependencies

We use [NPM's workspaces feature](https://docs.npmjs.com/cli/v7/using-npm/workspaces) to manage the monorepo. The installation of the dependencies for each package is simple:

```
git clone git@github.com:utrad-ical/circus
cd circus
npm ci
```

(Unlike Lerna, common dependencies are hoisted by default.)

### Automated Test, Lint & Code Formatting:

```bash
npm test
npm run prettier
npm run lint
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
# On monorepo root (the same steps as CI and the Dockerfile)
npm run prebuild-ts
npm run build-ts
npm run postbuild-ts
npm run build -w @utrad-ical/circus-web-ui
```
