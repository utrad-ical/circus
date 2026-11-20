import assert from 'node:assert/strict';
import { test } from 'node:test';
import isDirectory from './isDirectory.ts';

test('returns true for a directory', async () => {
  assert.equal(await isDirectory(import.meta.dirname), true);
});

test('returns false for a file', async () => {
  assert.equal(await isDirectory(import.meta.filename), false);
});

test('returns false for a nonexistent path', async () => {
  assert.equal(await isDirectory('/this/path/does/not/exist'), false);
});
