import assert from 'node:assert/strict';
import { test } from 'node:test';
import generateUniqueId from './generateUniqueId.ts';

test('generates a 26-character lowercase alphanumeric ID', () => {
  const id = generateUniqueId();
  assert.match(id, /^[0-9a-z]{26}$/);
});
