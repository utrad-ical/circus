import assert from 'node:assert/strict';
import { test } from 'node:test';
import createCounter from './createCounter.ts';

test('count up', async () => {
  const counter = await createCounter({});
  assert.equal(counter.getCount('foo'), 0);
  assert.equal(counter.getCount('bar'), 0);
  counter.countUp('foo');
  assert.equal(counter.getCount('foo'), 1);
  assert.equal(counter.getCount('bar'), 0);
});

test('return set of counters', async () => {
  const counter = await createCounter({});
  counter.countUp('foo');
  counter.countUp('bar');
  counter.countUp('bar');
  assert.deepEqual(counter.getCounts(), { foo: 1, bar: 2 });
});
