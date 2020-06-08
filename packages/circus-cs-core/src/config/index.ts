import * as circus from '../interface';
import path from 'path';
import loadConfig from '@utrad-ical/circus-lib/src/config/loadConfig';

const config = loadConfig(
  [path.join(__dirname, './default')],
  'circus'
) as circus.Configuration;

export default config;
