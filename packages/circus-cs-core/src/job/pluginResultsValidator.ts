import Ajv from 'ajv';
import path from 'path';
import fs from 'fs-extra';

const resultsSchema = require('../schemas/results.json');
const lesionCandAjv = new Ajv({ allErrors: true }).compile(resultsSchema);

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

    const isValid = lesionCandAjv(rawResults);
    if (!isValid)
      throw new Error(
        'Schema validation error for results.json file.\n' +
          lesionCandAjv
            .errors!.map(e => `${e.dataPath} ${e.message}`)
            .join('\n')
      );

    return rawResults;
  } catch (e) {
    throw new Error(`Plug-in validation failed: ${e.message}`);
  }
}
