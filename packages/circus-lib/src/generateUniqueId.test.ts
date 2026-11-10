import { test } from 'node:test';
import { expect } from 'expect';
import generateUniqueId from './generateUniqueId.ts';

test('generateUniqueId', () => {
  const result = generateUniqueId();
  expect(result).toMatch(/^[a-z0-9]{26}$/);
});
