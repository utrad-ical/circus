import { deleteAllCollections, usingModels } from '../../test/util-mongo';
import { command } from './migrate';

const modelsPromise = usingModels();

test('perform migration from scratch', async () => {
  const { db, models } = await modelsPromise;
  await deleteAllCollections(db);
  const commandFunc = await command(null, { db, models });
  const spy1 = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({});
  expect(spy1).toHaveBeenCalledWith('Current Revision: 0');
  expect(spy1).toHaveBeenCalledWith('The database is now up to date.');

  // Shows 'up to date' message on second run
  const spy2 = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({});
  expect(spy2).toBeCalledWith('Already up to date.');
});
