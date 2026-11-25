# CIRCUS end-to-end tests

Opens each page of the web UI in a headless browser and checks that it shows no errors: no exception, no `console.error`, and no API response of 400 or above.

Not run in CI. Run them by hand after changes that may affect many pages.

## Usage

MongoDB must be running (a replica set, as for `pnpm test`). The dev servers are not needed.

```bash
cd packages/e2e
pnpm exec playwright install chromium-headless-shell   # once
pnpm e2e
```

Takes about 30 seconds. Pass Playwright options after `pnpm e2e`, e.g. `pnpm e2e -g case` to run some of the pages.

## What it does

The setup (`setup.ts`) prepares everything from scratch on each run:

- Drops the database `circus-e2e` and runs the migrations, which add the user `circus` (password `circus`) and a project
- Builds the web UI and starts it with `vite preview`, together with the API, on ports of their own
- Imports the test DICOM series (`circus-api/test/dicom/head-first*.dcm`) and creates a case through the API
- Adds a mock plug-in and a finished job of it directly to the database (plug-ins need Docker to run)

The files go to a temporary directory, removed after the run. The database is left for inspection.

Environment variables (optional):

- `E2E_MONGO_URL` (default `mongodb://localhost:27017/circus-e2e?directConnection=true`)
- `E2E_API_PORT`, `E2E_WEB_PORT` (default `18080` and `18081`)
