import path from 'path';
import loadConfig from '@utrad-ical/circus-lib/config';

const config = loadConfig(
  [path.join(import.meta.dirname, '../../config/default')],
  'circus'
);

export default config;
