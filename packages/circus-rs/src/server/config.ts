import path from 'path';
import loadConfig from '@utrad-ical/circus-lib/lib/config/loadConfig';

const config = loadConfig(
  [path.join(__dirname, '../../config/default')],
  'circus'
);

export default config;
