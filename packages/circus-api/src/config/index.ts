import loadConfig from '@utrad-ical/circus-lib/config';
import path from 'path';

import { fileURLToPath } from 'node:url';

const csDefault = fileURLToPath(
  import.meta.resolve('@utrad-ical/circus-cs-core/default-config')
);

const loadApiConfig = () =>
  loadConfig([csDefault, path.join(import.meta.dirname, 'default.ts')]);

export default loadApiConfig;
