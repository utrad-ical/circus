import path from 'path';
import loadConfig from '@utrad-ical/circus-lib/config';

const loadRsConfig = () =>
  loadConfig([path.join(import.meta.dirname, '../../config/default.js')]);

export default loadRsConfig;
