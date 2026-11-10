import assert from 'node:assert/strict';
import { it } from 'node:test';
import * as vr from './ValidatorRules.ts';

it('isTuple', () => {
  const t3 = vr.isTuple(3);
  assert.equal(t3('1,2,3'), true);
  assert.equal(t3('1.1,2.5,-3.8'), true);
  assert.equal(t3('1,2'), false);
  assert.equal(t3('1,,3'), false);
  assert.equal(t3('5'), false);
  assert.equal(t3(''), false);
});

it('parseTuple', () => {
  let p3 = vr.parseTuple(3, true);
  assert.deepEqual(p3('1,3,5'), [1, 3, 5]);
  assert.deepEqual(p3('1,-3,5.7'), [1, -3, 5]);
  p3 = vr.parseTuple(3, false);
  assert.deepEqual(p3('1,3,5'), [1, 3, 5]);
  assert.deepEqual(p3('1.3,-3,5.7'), [1.3, -3, 5.7]);
});

it('parseBoolean', () => {
  const b = vr.parseBoolean;
  assert.equal(b('yes'), true);
  assert.equal(b('1'), true);
  assert.equal(b('true'), true);
  assert.equal(b('no'), false);
  assert.equal(b('0'), false);
  assert.equal(b('false'), false);
});
