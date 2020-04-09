import loadConfig from '@utrad-ical/circus-lib/lib/config/loadConfig';
import path from 'path';

const config = loadConfig([
  '@utrad-ical/circus-cs-core/src/config/default', // CS Core Defaults
  path.join(__dirname, 'default') // API server defaults
]);

export default config;
