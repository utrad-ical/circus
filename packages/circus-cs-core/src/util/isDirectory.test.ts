import assert from 'node:assert/strict';
import { test } from 'node:test';
import isDirectory from './isDirectory.ts';

test('return true for true directory', async () => {
  assert.equal(await isDirectory(import.meta.dirname), true);
});

test('return false for a file', async () => {
  assert.equal(await isDirectory(import.meta.filename), false);
});

test('return false for nonexistent path', async () => {
  assert.equal(await isDirectory('/this/path/does/not/exist'), false);
});
