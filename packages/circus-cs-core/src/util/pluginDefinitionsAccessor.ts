import path from 'path';
import fs from 'fs-extra';
import { PluginDefinition } from '../interface';

export interface PluginDefinitionAccessor {
  save: (pluginDefinitions: PluginDefinition[]) => Promise<void>;
  load: () => Promise<PluginDefinition[]>;
}

export default function pluginDefinitionsAccessor(
  coreWorkingDir: string
): PluginDefinitionAccessor {
  const filename = 'pluginDefinitions.js';
  return {
    save: async (pluginDefinitions: PluginDefinition[]) => {
      // Check duplicated pluginId.
      const duplications = pluginDefinitions
        .map(i => i.pluginId)
        .filter((x, i, self) => self.indexOf(x) !== self.lastIndexOf(x));
      if (duplications.length > 0)
        throw new Error('There is duplicated pluginId.');

      // Save as file
      await fs.ensureDir(coreWorkingDir);
      await fs.writeFile(
        path.join(coreWorkingDir, filename),
        JSON.stringify(pluginDefinitions)
      );
    },
    load: async () => {
      const jsonStr = await fs.readFile(
        path.join(coreWorkingDir, filename),
        'utf8'
      );
      return JSON.parse(jsonStr);
    }
  };
}
