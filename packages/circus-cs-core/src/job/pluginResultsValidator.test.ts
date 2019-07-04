import path from 'path';
import pluginResultsValidator from './pluginResultsValidator';

describe('Validate lesion candidate plug-in results', () => {
  const testResultsDir = path.resolve(__dirname, '../../test/results');

  const checkOne = async (target: string, shouldBeValid: boolean = true) => {
    const dir = path.join(testResultsDir, target);
    if (shouldBeValid) {
      await pluginResultsValidator(dir);
    } else {
      await expect(pluginResultsValidator(dir)).rejects.toThrow(
        /validation failed/
      );
    }
  };

  test('succeeds', async () => {
    await checkOne('succeed', true);
  });

  test('fails for invalid JSON', async () => {
    await checkOne('invalid', false);
  });

  test('fails if there is no results.json file', async () => {
    await checkOne('empty', false);
  });
});
