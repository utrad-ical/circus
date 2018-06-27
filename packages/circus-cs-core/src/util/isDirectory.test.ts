import isDirectory from './isDirectory';

test('return true for true directory', async () => {
  expect(await isDirectory(__dirname)).toBe(true);
});

test('return false for a file', async () => {
  expect(await isDirectory(__filename)).toBe(false);
});

test('return false for nonexistent path', async () => {
  expect(await isDirectory('/this/path/does/not/exist')).toBe(false);
});
