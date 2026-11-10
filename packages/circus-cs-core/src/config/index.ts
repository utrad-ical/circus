import type * as circus from '../interface.ts';
import path from 'path';
import loadConfig from '@utrad-ical/circus-lib/config';

const config = loadConfig(
  [path.join(__dirname, './default')],
  'circus'
) as circus.Configuration;

export default config;
