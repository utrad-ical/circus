import createDefaultAuthProvider from './DefaultAuthProvider';
import { usingModels, setUpMongoFixture } from '../../../../test/util-mongo';
import { Models } from '../../../interface';

const modelsPromise = usingModels();
let models: Models;

beforeAll(async () => {
  const { db } = (await modelsPromise).database;
  models = (await modelsPromise).models;
  await setUpMongoFixture(db, ['users']);
});

describe('defaultAuthProvider', () => {
  test('OK', async () => {
    const authProvider = await createDefaultAuthProvider({}, { models });
    expect(
      await authProvider.check('alice@example.com', 'aliceSecret')
    ).toMatchObject({
      result: 'OK',
      authenticatedUserEmail: 'alice@example.com'
    });
  });

  test('Invalid password', async () => {
    const authProvider = await createDefaultAuthProvider({}, { models });
    expect(
      await authProvider.check('alice@example.com', 'dummy')
    ).toMatchObject({ result: 'NG' });
  });

  test('Invalid user', async () => {
    const authProvider = await createDefaultAuthProvider({}, { models });
    expect(
      await authProvider.check('dummy@example.com', 'dummy')
    ).toMatchObject({ result: 'NG' });
  });
});
