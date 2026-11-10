import { test, mock } from 'node:test';
import { expect } from 'expect';
import { command } from './ulid.ts';

test('ulid', async () => {
  const commandFunc = await command(undefined, {});
  const spy = mock.method(console, 'log', () => {});
  await commandFunc({});
  expect(spy.mock.calls[0].arguments[0]).toMatch(/[a-z0-9]{26}/);
});
