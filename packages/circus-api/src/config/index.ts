import csCoreDefaults from '@utrad-ical/circus-cs-core/src/config/default';
import { cosmiconfigSync } from 'cosmiconfig';
import merge from 'merge';
import defaults, { Configuration } from './default';

const loadConfig = (configTitle: string) => {
  const explorer = cosmiconfigSync(configTitle);
  const result = explorer.search() || { config: {} };
  const config = merge.recursive(
    {},
    csCoreDefaults,
    defaults,
    result.config
  ) as Configuration;
  return config;
};

const config = loadConfig('circus');

export default config;
