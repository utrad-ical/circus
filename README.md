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

The easiest way to get CIRCUS working is to use our official Docker image, which includes a database server and an httpd. For more information, visit the official CIRCUS website.

**Follow the instruction below only when you want to install CIRCUS manually or develop CIRCUS itself.**

### Install Requirements

- Node.js (>= 12.x) and NPM (should be installed along with Node)
- Docker
- MongoDB

### Install JavaScript Dependencies

We use lerna to manage the repository. First, clone the repository:

```bash
git clone git@github.com:utrad-ical/circus
cd circus
```

Install dependency of the main monorepo itself, and then install all the dependencies of each package.

```bash
npm ci
npx lerna bootstrap --hoist --ci
```

**The `--hoist` flag is important**. Otherwise, two packages will see separate React installations, which ends up weird run-time errors.

Try removing the `--ci` option if something went wrong.

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
npx lerna run build
```
