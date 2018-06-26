import isDirectory from './isDirectory';

describe('isDirectory', () => {
  test('return true for true directory', async () => {
    const result = await isDirectory(__dirname);
    expect(result).toBe(true);
  });

  test('return false for a file', async () => {
    const result = await isDirectory(__filename);
    expect(result).toBe(false);
  });

  test('return false for nonexistent path', async () => {
    const result = await isDirectory('/this/path/does/not/exist');
    expect(result).toBe(false);
  });
});
