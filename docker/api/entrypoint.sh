#!/bin/sh
# Entrypoint for the circus-api image.
# Runs under tini (compose `init: true`), then execs the given command
# (`node server.js` by default).
set -eu

# The host machine's IP address, used by some configuration files
# (e.g., dicomImageServerUrl). If not given explicitly, resolve it from
# the `hostmachine` entry (compose `extra_hosts`), if any.
if [ -z "${LOCAL_HOST_IP:-}" ]; then
  LOCAL_HOST_IP=$(getent hosts hostmachine | awk '{ print $1 }' || true)
  export LOCAL_HOST_IP
fi

# Directories under the data directory used by the default configuration
for dir in dicom labels plugin-results plugin-cache cs-tmp downloads logs; do
  mkdir -p "/var/circus/data/$dir"
done

# Start the CS job manager in the background (managed by the pm2 library,
# the same way as the "start" button in the admin screen).
# Only when starting the server, not for one-off commands such as migrate.
if [ "${AUTO_BOOT_JOB_MANAGER:-0}" = "1" ] && [ "$*" = "node server.js" ]; then
  echo "Starting CS job manager..."
  node /var/circus/packages/circus-cs-core/cui.js start ||
    echo "Warning: failed to start CS job manager" >&2
fi

exec "$@"
