import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isDicomUid } from './validation.ts';

test('isDicomUid', () => {
  assert.equal(isDicomUid(''), false);
  assert.equal(isDicomUid('1111.222..8'), false);
  assert.equal(isDicomUid('11118'), false);
  assert.equal(isDicomUid('1.3333.'.repeat(10) + '555'), false);
  assert.equal(isDicomUid('1.3333.55555'), true);
  assert.equal(isDicomUid('1.3333.00.55555'), true);
  assert.equal(isDicomUid('1.3333.00.55555', true), false);
});
