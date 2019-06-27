import path from 'path';
import pluginResultsValidator from './pluginResultsValidator';

describe('Validate lesion candidate plug-in results', () => {
  const testResultsDir = path.resolve(__dirname, '../../test/docker/results');

  const checkOne = async (dirBasename: string, isValid: boolean = true) => {
    const dir = path.join(testResultsDir, dirBasename);
    if (isValid) {
      await pluginResultsValidator(dir);
    } else {
      await expect(pluginResultsValidator(dir)).rejects.toThrow(
        /validation failed/
      );
    }
  };

  test('succeeds', async () => {
    await checkOne('succeeds', true);
  });

  test('fails', async () => {
    await checkOne('fails', false);
  });
});
