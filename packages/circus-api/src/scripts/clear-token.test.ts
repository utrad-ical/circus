import { setUpMongoFixture, usingModels } from '../../test/util-mongo';
import { command } from './clear-token';
import { CommandFunc } from './Command';

const modelsPromise = usingModels();
let commandFunc: CommandFunc;

beforeEach(async () => {
  const { db, models } = await modelsPromise;
  await setUpMongoFixture(db, ['tokens']);
  commandFunc = await command(null, { models });
});

test('delete only non-permanent tokens', async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({});
  expect(spy).toBeCalledWith('Deleted 3 access token(s).');
});

test('delete all tokens including permanent ones', async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({ all: true });
  expect(spy).toBeCalledWith('Deleted 4 access token(s).');
});
