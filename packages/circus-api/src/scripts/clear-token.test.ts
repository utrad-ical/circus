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
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({});
  expect(spy).toBeCalledWith('Deleted 7 access token(s).');
});

test('delete all tokens including permanent ones', async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({ all: true });
  expect(spy).toBeCalledWith('Deleted 8 access token(s).');
});
