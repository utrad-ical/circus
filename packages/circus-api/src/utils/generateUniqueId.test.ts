import assert from 'node:assert/strict';
import { it } from 'node:test';
import generateUniqueId from './generateUniqueId.ts';

it('generateUniqueId', () => {
  const id = generateUniqueId();
  assert.match(id, /^[0-9a-z]{26}$/);
});
