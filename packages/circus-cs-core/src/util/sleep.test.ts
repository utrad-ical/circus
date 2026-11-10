import assert from 'node:assert/strict';
import { test } from 'node:test';
import sleep from './sleep.ts';

test('sleep', async () => {
  const start = Date.now();
  await sleep(100);
  assert.ok(start < Date.now() - 90);
});
