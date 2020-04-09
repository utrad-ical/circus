import { cosmiconfigSync } from 'cosmiconfig';
import merge from 'merge';

/**
 * Synchronously loads "default" configuration files and
 * merges a "custom" configuration fetched via cosmiconfig.
 * @param defaultModules The ES5 module paths that contains
 * the default config entries.
 * @param configTitle The config file name used by cosmiconfig for searching
 * (e.g, `<configTitle>.config.js`)
 */
const loadConfig = (
  defaultModules: string[],
  configTitle: string = 'circus',
  options: { searchFrom?: string } = {}
) => {
  let result: any = {};
  for (const path of defaultModules) {
    const conf = require(path).default;
    result = merge.recursive(result, conf);
  }
  const explorer = cosmiconfigSync(configTitle);
  const custom = explorer.search(options.searchFrom) || { config: {} };
  result = merge.recursive(result, custom.config);
  return result;
};

export default loadConfig;
