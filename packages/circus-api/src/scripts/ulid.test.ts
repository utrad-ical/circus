import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { command } from './ulid.ts';

test('ulid', async () => {
  const commandFunc = await command(undefined, {});
  const spy = mock.method(console, 'log', () => {});
  await commandFunc({});
  assert.match(spy.mock.calls[0].arguments[0], /[a-z0-9]{26}/);
});
