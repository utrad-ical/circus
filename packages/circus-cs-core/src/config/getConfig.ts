import merge from 'merge';
import cosmiconfig from 'cosmiconfig';
import { Configuration } from './Configuration';
import defaults from './default';

export function getConfig(
  configTitle: string,
  overwrite: Partial<Configuration> = {}
): Configuration {
  const explorer = cosmiconfig(configTitle);
  const result = explorer.searchSync() || { config: {} };
  const config = merge.recursive(
    {},
    defaults,
    result.config,
    overwrite
  ) as Configuration;
  return config;
}

export default getConfig;
