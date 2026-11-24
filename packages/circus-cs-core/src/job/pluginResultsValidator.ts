import path from 'path';
import fs from 'node:fs/promises';
import { resultsSchema } from '../schemas/results.ts';

/**
 * Performs the validation.
 * @param outDir Physycal path of plugin output directory which includes 'results.json'.
 * @throws Throws some exception if validation failed.
 * @returns The original `results`, or modified/filtered results.
 */
export default async function pluginResultsValidator(
  outDir: string
): Promise<any> {
  try {
    const jsonStr = await fs.readFile(
      path.join(outDir, 'results.json'),
      'utf8'
    );
    const rawResults = JSON.parse(jsonStr);

    const result = resultsSchema.safeParse(rawResults);
    if (!result.success)
      throw new Error(
        'Schema validation error for results.json file.\n' +
          result.error.issues
            .map(i => `/${i.path.join('/')} ${i.message}`)
            .join('\n')
      );

    return rawResults;
  } catch (e: any) {
    throw new Error(`Plug-in validation failed: ${e.message}`);
  }
}
