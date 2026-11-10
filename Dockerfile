# CIRCUS container images
#
#   target `web` -> circus-web: Caddy + web UI (SPA)
#   target `api` -> circus-api: API server, CIRCUS RS, CS job manager

ARG NODE_VERSION=26

# ---------------------------------------------------------------------------
# build (shared; not published)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm AS build

WORKDIR /var/circus
COPY . .
# Install the pnpm version pinned by `packageManager` in package.json
# (corepack is no longer bundled with Node 25+)
RUN npm install -g "$(node -p 'require("./package.json").packageManager')"
# Same build steps as CI (tsc -b follows project references in order)
RUN pnpm install --frozen-lockfile && \
    pnpm run prebuild-ts && \
    pnpm run build-ts && \
    pnpm run postbuild-ts && \
    pnpm -F @utrad-ical/circus-web-ui run build

# ---------------------------------------------------------------------------
# web -> circus-web
# Serves the SPA and proxies /api, /login, /rs to the api service
# ---------------------------------------------------------------------------
FROM caddy:2 AS web

COPY --from=build /var/circus/packages/circus-web-ui/public /srv
COPY docker/caddy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80

# ---------------------------------------------------------------------------
# api -> circus-api
# API server, CIRCUS RS, and CS job manager (started via the pm2 library)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS api

# Docker CLI is used to run dicom_utility and to extract plug-in files
# (Docker-outside-of-Docker via the mounted /var/run/docker.sock)
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker

# The server runs the TypeScript sources directly (Node.js type stripping).
# devDependencies are still included; pruning them is left for later.
COPY --from=build /var/circus /var/circus
RUN rm -rf /var/circus/packages/circus-web-ui/public

COPY docker/api/circus.config.js /var/circus/circus.config.js
COPY docker/api/entrypoint.sh /usr/local/bin/circus-entrypoint

ENV TZ=UTC \
    IP=0.0.0.0 \
    PM2_HOME=/var/circus/.pm2 \
    DOOD_HOST_WORKING_PATH=/var/circus/data \
    AUTO_BOOT_JOB_MANAGER=0

WORKDIR /var/circus/packages/circus-api

EXPOSE 8080

ENTRYPOINT ["circus-entrypoint"]
CMD ["node", "server.js"]
