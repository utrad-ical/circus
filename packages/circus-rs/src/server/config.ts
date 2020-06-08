import path from 'path';
import loadConfig from '@utrad-ical/circus-lib/src/config/loadConfig';

const config = loadConfig(
  [path.join(__dirname, '../../config/default')],
  'circus'
);

export default config;
