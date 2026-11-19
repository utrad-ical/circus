import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { test, mock } from 'node:test';
import { adminCliMongoConfig, runAdminCli } from '../test/util-admin-cli.ts';
import { deleteAllCollections, usingModels } from '../test/util-mongo.ts';
import { command } from './migrate.ts';

const modelsPromise = usingModels();

test('perform migration from scratch', async () => {
  const { database, models } = await modelsPromise;
  const { db } = database;
  await deleteAllCollections(db);
  const commandFunc = await command(null, { database, models });
  const spy1 = mock.method(console, 'log', () => {});
  await commandFunc();
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
  await commandFunc();
  assert.ok(
    spy2.mock.calls
      .map(c => c.arguments)
      .some((item: unknown) => isDeepStrictEqual(item, ['Already up to date.']))
  );
});

test('reports a failed migration without recording the new revision', async t => {
  const { db } = (await modelsPromise).database;
  await deleteAllCollections(db);
  t.after(() => deleteAllCollections(db));
  await db.collection('migration').insertOne({ revision: 25 });
  await db.collection('users').insertOne({
    userEmail: 'broken@example.test',
    myLists: {} // Migration 026 expects an iterable.
  });

  const configPath = await adminCliMongoConfig(t);
  const result = runAdminCli(['migrate'], configPath);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Error: 026-move-my-lists\.js/);
  assert.doesNotMatch(result.stdout, /The database is now up to date/);
  const recorded = await db.collection('migration').findOne();
  assert.equal(recorded?.revision, 25);
});
