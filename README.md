# CIRCUS

This is a monorepo that contains all CIRCUS projects.

- **circus-api**: JSON-based REST API server
- **circus-web-ui**: Front-end code for CIRCUS web UI
- **circus-cs-core**: Includes job manager daemon and CS related code
- **circus-rs**: Web-based DICOM viewer with 3D annotation capability
- **circus-lib**: Code shared among the above projects

## Installing and Building

We use lerna to manage the repository. First, clone the repository:

```bash
git clone git@github.com:utrad-ical/circus
cd circus
```

Dependency installation for development:

```bash
npm ci
npx lerna bootstrap --hoist --ci
```

(Try removing the `--ci` option if something went wrong)

Build for deployment:

```bash
npm ci
npx lerna bootstrap --hoist --ci
npx lerna run build
```

Automated test, lint, code formatting:

```bash
npm test
npm run prettier
npm run lint
```

For more information, visit the official CIRCUS website.
