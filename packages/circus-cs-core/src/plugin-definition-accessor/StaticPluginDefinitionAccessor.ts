import path from 'path';
import fs from 'fs-extra';
import { PluginDefinition } from '../interface';
import { PluginDefinitionAccessor } from '../CsCore';
import { FunctionService } from '@utrad-ical/circus-lib';

const createStaticPluginDefinitionAccessor: FunctionService<
  PluginDefinitionAccessor,
  {}
> = async ({ dir }: { dir: string }) => {
  if (typeof dir !== 'string')
    throw new TypeError('plugin directory must be set');

  const filename = 'plugins.json';

  const list: () => Promise<PluginDefinition[]> = async () => {
    const jsonStr = await fs.readFile(path.join(dir, filename), 'utf8');
    return JSON.parse(jsonStr);
  };

  const get: (pluginId: string) => Promise<PluginDefinition> = async (
    pluginId: string
  ) => {
    const plugin = (await list()).find(p => p.pluginId === pluginId);
    if (!plugin) throw new Error(`No such plugin: ${pluginId}`);
    return plugin;
  };

  return { list, get };
};

export default createStaticPluginDefinitionAccessor;
