import { cosmiconfigSync } from 'cosmiconfig';
import merge from 'merge';

/**
 * Loads a JavaScript config module.
 * Both ES modules (`export default {...}`) and CommonJS modules
 * (`module.exports = {...}`) are supported; Node.js can `require()`
 * ES modules that do not use top-level await.
 */
const loadModule = (filePath: string) => {
  const mod = require(filePath);
  return mod && typeof mod === 'object' && 'default' in mod ? mod.default : mod;
};

/**
 * Synchronously loads "default" configuration files and
 * merges a "custom" configuration fetched via cosmiconfig.
 * @param defaultModules The module paths that contain
 * the default config entries (as the default export).
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
    const conf = loadModule(path);
    result = merge.recursive(result, conf);
  }
  const explorer = cosmiconfigSync(configTitle, {
    // cosmiconfig's defaults plus .mjs / .cjs
    searchPlaces: [
      'package.json',
      `.${configTitle}rc`,
      `.${configTitle}rc.json`,
      `.${configTitle}rc.yaml`,
      `.${configTitle}rc.yml`,
      `.${configTitle}rc.js`,
      `${configTitle}.config.js`,
      `${configTitle}.config.mjs`,
      `${configTitle}.config.cjs`
    ],
    loaders: {
      '.js': loadModule,
      '.mjs': loadModule,
      '.cjs': loadModule
    }
  });
  const custom = explorer.search(options.searchFrom) || { config: {} };
  result = merge.recursive(result, custom.config);
  return result;
};

export default loadConfig;
