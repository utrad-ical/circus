# CIRCUS

This is a monorepo that contains all CIRCUS projects.

- **circus-api**: JSON-based REST API server
- **circus-web-ui**: Front-end code for CIRCUS web UI
- **circus-cs-core**: Includes job manager daemon and CS related code
- **circus-rs**: Web-based DICOM viewer with 3D annotation capability
- **circus-lib**: Code shared among the above projects

## Installing and Building

We use lerna to manage the repository.

```bash
git clone git@github.com:utrad-ical/circus
cd circus
npm ci
lerna bootstrap --hoist
```

For more information, visit the official CIRCUS website.
