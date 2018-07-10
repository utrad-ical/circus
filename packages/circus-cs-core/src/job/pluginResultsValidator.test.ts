import { createLesionCandResultValidator } from './pluginResultsValidator';

describe('Validate lesion candidate plug-in results', async () => {
  test('succeeds', async () => {
    const validator = createLesionCandResultValidator();
    const data = { lesion_candidates: [] };
    await validator.validate(data, __dirname); // dirname is dummy
  });

  test('fails', async () => {
    const validator = createLesionCandResultValidator();
    const data = { lesion_candidates: [{ location_x: '334' }] };
    // await validator.validate(data, __dirname);
    await expect(validator.validate(data, __dirname)).rejects.toThrow(
      /validation failed/
    );
  });
});
