import assert from 'node:assert/strict';
import { test } from 'node:test';
import generateUniqueId from './generateUniqueId.ts';

test('generateUniqueId', () => {
  const result = generateUniqueId();
  assert.match(result, /^[a-z0-9]{26}$/);
});
