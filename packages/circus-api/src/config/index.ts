import loadConfig from '@utrad-ical/circus-lib/config';
import path from 'path';

const csDefault = require.resolve('@utrad-ical/circus-cs-core/default-config');

const config = loadConfig([
  csDefault, // CS Core Defaults
  path.join(__dirname, 'default') // API server defaults
]);

export default config;
