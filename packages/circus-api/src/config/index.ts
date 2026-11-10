import loadConfig from '@utrad-ical/circus-lib/config';
import path from 'path';

import { fileURLToPath } from 'node:url';

const csDefault = fileURLToPath(
  import.meta.resolve('@utrad-ical/circus-cs-core/default-config')
);

const config = loadConfig([
  csDefault, // CS Core Defaults
  path.join(import.meta.dirname, 'default') // API server defaults
]);

export default config;
