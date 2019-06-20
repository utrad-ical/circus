import merge from 'merge';
import cosmiconfig from 'cosmiconfig';
import defaults from './default';
import Configuration from './Configuration';

const loadConfig = (
  configTitle: string,
  overwrite: Partial<Configuration> = {}
) => {
  const explorer = cosmiconfig(configTitle);
  const result = explorer.searchSync() || { config: {} };
  const config = merge.recursive(
    {},
    defaults,
    result.config,
    overwrite
  ) as Configuration;
  return config;
};

const config = loadConfig('cscore');

export default config;
