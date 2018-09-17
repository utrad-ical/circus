import path from 'path';
import fs from 'fs-extra';
import { PluginDefinition } from '../interface';

export type PluginDefinitionLoader = (
  pluginId: string
) => Promise<PluginDefinition>;
export interface PluginDefinitionAccessor {
  save: (pluginDefinitions: PluginDefinition[]) => Promise<void>;
  load: () => Promise<PluginDefinition[]>;
  get: PluginDefinitionLoader;
}

export default function pluginDefinitionsAccessor(
  coreWorkingDir: string
): PluginDefinitionAccessor {
  const filename = 'pluginDefinitions.js';

  const save: (pluginDefinitions: PluginDefinition[]) => Promise<void> = async (
    pluginDefinitions: PluginDefinition[]
  ) => {
    // Check duplicated pluginId.
    const anyDuplication = pluginDefinitions
      .map(i => i.pluginId)
      .some((x, i, self) => self.indexOf(x) !== self.lastIndexOf(x));
    if (anyDuplication) throw new Error('There is duplicated pluginId.');

    // Save as file
    await fs.ensureDir(coreWorkingDir);
    await fs.writeFile(
      path.join(coreWorkingDir, filename),
      JSON.stringify(pluginDefinitions)
    );
  };

  const load: () => Promise<PluginDefinition[]> = async () => {
    const jsonStr = await fs.readFile(
      path.join(coreWorkingDir, filename),
      'utf8'
    );
    return JSON.parse(jsonStr);
  };

  const get: (pluginId: string) => Promise<PluginDefinition> = async (
    pluginId: string
  ) => {
    const plugin = (await load()).find(p => p.pluginId === pluginId);
    if (!plugin) throw new Error(`No such plugin: ${pluginId}`);
    return plugin;
  };

  return { save, load, get };
}
