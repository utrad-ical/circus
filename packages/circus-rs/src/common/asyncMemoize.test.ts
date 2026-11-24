import assert from 'node:assert/strict';
import { test } from 'node:test';
import asyncMemoize from './asyncMemoize.ts';

const tick = () => new Promise(resolve => setTimeout(resolve, 5));

test('shares a pending call among concurrent callers', async () => {
  let calls = 0;
  const memoized = asyncMemoize(
    async (key: string) => {
      calls++;
      await tick();
      return key + '!';
    },
    { maxSize: 100 }
  );
  const results = await Promise.all([memoized('a'), memoized('a')]);
  assert.deepEqual(results, ['a!', 'a!']);
  assert.equal(await memoized('a'), 'a!');
  assert.equal(calls, 1);
});

test('does not keep a failed call', async () => {
  let calls = 0;
  const memoized = asyncMemoize(
    async () => {
      calls++;
      await tick();
      if (calls === 1) throw new Error('failed');
      return 'ok';
    },
    { maxSize: 100 }
  );
  await assert.rejects(memoized('a'), /failed/);
  assert.equal(await memoized('a'), 'ok');
  assert.equal(calls, 2);
});

test('evicts entries by the size known after resolution', async () => {
  const memoized = asyncMemoize(async (key: string) => key.repeat(4), {
    maxSize: 10,
    length: value => value.length
  });
  await memoized('a');
  await memoized('b');
  await tick();
  assert.equal(memoized.getCount(), 2);
  await memoized('c');
  await tick();
  assert.equal(memoized.getCount(), 2);
});

test('does not keep an entry whose size cannot be calculated', async () => {
  let calls = 0;
  const memoized = asyncMemoize(
    async () => {
      calls++;
      return 'value';
    },
    {
      maxSize: 100,
      length: () => {
        throw new Error('bad size');
      }
    }
  );
  assert.equal(await memoized('a'), 'value');
  await tick();
  assert.equal(memoized.getCount(), 0);
  assert.equal(await memoized('a'), 'value');
  assert.equal(calls, 2);
});
