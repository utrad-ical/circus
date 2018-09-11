import path from 'path';
import fs from 'fs-extra';
import { PluginDefinition } from '../interface';

let infoDir: string | undefined = undefined;

export function setInfoDir(dir: string): void {
  infoDir = dir;
}

const filepath = (name: string) => {
  if (infoDir === undefined) throw new Error('info-dir is not set');

  return path.join(infoDir, name + '.js');
};

export async function setPluginDefinitions(
  pluginDefinitions: PluginDefinition[]
): Promise<void> {
  // Check duplicated pluginId.
  const duplications = pluginDefinitions
    .map(i => i.pluginId)
    .filter((x, _i, self) => self.indexOf(x) !== self.lastIndexOf(x));
  if (duplications.length > 0) throw new Error('There is duplicated pluginId.');

  // Check info-dir is set.
  if (infoDir === undefined) throw new Error('info-dir is not set');

  // Save as file
  await fs.ensureDir(infoDir);
  await fs.writeFile(
    filepath('pluginDefinitions'),
    JSON.stringify(pluginDefinitions)
  );
}

export async function getPluginDefinitions(): Promise<PluginDefinition[]> {
  const jsonStr = await fs.readFile(filepath('pluginDefinitions'), 'utf8');
  return JSON.parse(jsonStr);
}
