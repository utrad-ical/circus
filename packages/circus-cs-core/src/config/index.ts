import merge from 'merge';
import cosmiconfig from 'cosmiconfig';
import defaults from './default';
import * as circus from '../interface';

const loadConfig = (
  configTitle: string,
  overwrite: Partial<circus.Configuration> = {}
) => {
  const explorer = cosmiconfig(configTitle);
  const result = explorer.searchSync() || { config: {} };
  const config = merge.recursive(
    {},
    defaults,
    result.config,
    overwrite
  ) as circus.Configuration;
  return config;
};

const config = loadConfig('circus');

export default config;
