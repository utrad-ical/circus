import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { test, beforeEach, mock } from 'node:test';
import { setUpMongoFixture, usingModels } from '../test/util-mongo.ts';
import { command } from './clear-token.ts';
import type { CommandFunc } from './Command.ts';

const modelsPromise = usingModels();
let commandFunc: CommandFunc;

beforeEach(async () => {
  const { database, models } = await modelsPromise;
  const { db } = database;
  await setUpMongoFixture(db, ['tokens']);
  commandFunc = await command(null, { models });
});

test('delete only non-permanent tokens', async () => {
  const spy = mock.method(console, 'log', () => {});
  await commandFunc({});
  assert.ok(
    spy.mock.calls
      .map(c => c.arguments)
      .some((item: unknown) =>
        isDeepStrictEqual(item, ['Deleted 7 access token(s).'])
      )
  );
});

test('delete all tokens including permanent ones', async () => {
  const spy = mock.method(console, 'log', () => {});
  await commandFunc({ all: true });
  assert.ok(
    spy.mock.calls
      .map(c => c.arguments)
      .some((item: unknown) =>
        isDeepStrictEqual(item, ['Deleted 8 access token(s).'])
      )
  );
});
