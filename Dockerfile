# CIRCUS container images
#
#   target `web` -> circus-web: Caddy + web UI (SPA)
#   target `api` -> circus-api: API server, CIRCUS RS, CS job manager

ARG NODE_VERSION=22

# ---------------------------------------------------------------------------
# build (shared; not published)
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm AS build

WORKDIR /var/circus
COPY . .
# Same build steps as CI (tsc -b follows project references in order)
RUN npm ci && \
    npm run prebuild-ts && \
    npm run build-ts && \
    npm run postbuild-ts && \
    npm run build -w @utrad-ical/circus-web-ui

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

# devDependencies are kept because the server transpiles TypeScript
# at runtime using @babel/register
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
