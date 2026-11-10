import { test } from 'node:test';
import { expect } from 'expect';
import sleep from './sleep.ts';

test('sleep', async () => {
  const start = Date.now();
  await sleep(100);
  expect(start).toBeLessThan(Date.now() - 90);
});
