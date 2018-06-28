import { PluginDefinition } from '../interface';
import * as fs from 'fs-extra';
import * as path from 'path';
import isDirectory from '../util/isDirectory';

export default async function validatePluginResults(
  pluginDefinition: PluginDefinition,
  outDir: string
): Promise<void> {
  if (!(await isDirectory(outDir))) {
    throw new Error(`${outDir} is not a directory`);
  }
  const results = await fs.readFile(path.join(outDir, 'results.json'), 'utf8');
  JSON.parse(results);
}
