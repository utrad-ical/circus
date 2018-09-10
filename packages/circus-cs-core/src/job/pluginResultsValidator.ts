import Ajv from 'ajv';

/**
 * PluginResultValidator detects
 */
export interface PluginResultsValidator {
  /**
   * Performs the validation.
   * @param results Output from JSON.
   * @param outDir Physycal path of plugin output directory.
   * @throws Throws some exception if validation failed.
   * @returns The original `results`, or modified/filtered results.
   */
  validate(results: any, outDir: string): Promise<any>;
}

const schema: object = {
  type: 'object',
  properties: {
    lesion_candidates: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          location_x: { type: 'number' },
          location_y: { type: 'number' },
          location_z: { type: 'number' },
          volume_size: { type: 'number' },
          confidence: { type: 'number' }
        },
        required: ['location_x', 'location_y', 'location_z']
      }
    }
  },
  required: ['lesion_candidates']
};

const lesionCandAjv = new Ajv({ allErrors: true }).compile(schema);

export function createLesionCandResultValidator(): PluginResultsValidator {
  const validate = async (results: any) => {
    // TODO: FIXME: We transform the results from old lung-cad plugin here
    if (typeof results === 'object' && '1' in results) {
      const numeralKeys = Object.keys(results)
        .map(stringKey => parseInt(stringKey))
        .sort(); // sort as number
      results = {
        lesion_candidates: numeralKeys.map(k => results[k.toString()])
      };
    }
    // end of FIXME

    const isValid = lesionCandAjv(results);
    if (!isValid)
      throw new Error(
        'Result validation failed.\n' +
          lesionCandAjv
            .errors!.map(e => `${e.dataPath} ${e.message}`)
            .join('\n')
      );
    return results;
  };
  return { validate };
}
