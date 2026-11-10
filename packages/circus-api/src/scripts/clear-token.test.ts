import { test, beforeEach, mock } from 'node:test';
import { expect } from 'expect';
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
  expect(spy.mock.calls.map(c => c.arguments)).toContainEqual([
    'Deleted 7 access token(s).'
  ]);
});

test('delete all tokens including permanent ones', async () => {
  const spy = mock.method(console, 'log', () => {});
  await commandFunc({ all: true });
  expect(spy.mock.calls.map(c => c.arguments)).toContainEqual([
    'Deleted 8 access token(s).'
  ]);
});
