This directory contains the config loader for the CIRCUS project.

The loader merges the supplied defaults with the object exported by the file
specified in `CIRCUS_CONFIG`. When the variable is unset, it loads the first
existing file at the workspace root in this order: `circus.config.js`,
`circus.config.mjs`, `circus.config.cjs`, `circus.config.mts`. In the API
container, the workspace root is `/var/circus`.
