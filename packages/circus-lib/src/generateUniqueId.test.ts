import assert from 'node:assert/strict';
import { test } from 'node:test';
import generateUniqueId from './generateUniqueId.ts';

test('generates a 26-character lowercase alphanumeric ID', () => {
  const result = generateUniqueId();
  assert.match(result, /^[a-z0-9]{26}$/);
});
