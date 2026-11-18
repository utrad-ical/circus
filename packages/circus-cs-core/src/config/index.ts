import type * as circus from '../interface.ts';
import path from 'path';
import loadConfig from '@utrad-ical/circus-lib/config';

const loadCsConfig = (): Promise<circus.Configuration> =>
  loadConfig([path.join(import.meta.dirname, 'default.ts')]);

export default loadCsConfig;
