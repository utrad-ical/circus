import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as merge from 'merge';

const config = require('../config/default');

let env = {};
try {
  env = require('../config/env');
  merge.recursive(config, env);
} catch (e) {}

function parsePluginConfig(pluginConfigPath: string) {
  const pluginConfigContent = yaml.safeLoad(
    fs.readFileSync(pluginConfigPath, 'utf8')
  );
  const pluginConfig: any = {};
  if (typeof pluginConfigContent !== 'undefined')
    [].forEach.call(pluginConfigContent, (p: any) => {
      pluginConfig[p.pluginName] = p;
    });
  return pluginConfig;
}
config.plugins = parsePluginConfig(config.pluginConfigPath);

export default config;
