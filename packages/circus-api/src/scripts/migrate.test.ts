import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { test, mock } from 'node:test';
import { deleteAllCollections, usingModels } from '../test/util-mongo.ts';
import { command } from './migrate.ts';

const modelsPromise = usingModels();

test('perform migration from scratch', async () => {
  const { database, models } = await modelsPromise;
  const { db } = database;
  await deleteAllCollections(db);
  const commandFunc = await command(null, { database, models });
  const spy1 = mock.method(console, 'log', () => {});
  await commandFunc({});
  assert.ok(
    spy1.mock.calls
      .map(c => c.arguments)
      .some((item: unknown) => isDeepStrictEqual(item, ['Current Revision: 0']))
  );
  assert.ok(
    spy1.mock.calls
      .map(c => c.arguments)
      .some((item: unknown) =>
        isDeepStrictEqual(item, ['The database is now up to date.'])
      )
  );

  // Shows 'up to date' message on second run
  const spy2 = mock.method(console, 'log', () => {});
  await commandFunc({});
  assert.ok(
    spy2.mock.calls
      .map(c => c.arguments)
      .some((item: unknown) => isDeepStrictEqual(item, ['Already up to date.']))
  );
});
