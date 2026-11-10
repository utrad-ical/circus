import { test, mock } from 'node:test';
import { expect } from 'expect';
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
  expect(spy1.mock.calls.map(c => c.arguments)).toContainEqual([
    'Current Revision: 0'
  ]);
  expect(spy1.mock.calls.map(c => c.arguments)).toContainEqual([
    'The database is now up to date.'
  ]);

  // Shows 'up to date' message on second run
  const spy2 = mock.method(console, 'log', () => {});
  await commandFunc({});
  expect(spy2.mock.calls.map(c => c.arguments)).toContainEqual([
    'Already up to date.'
  ]);
});
