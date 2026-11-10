import assert from 'node:assert/strict';
import { describe, test, before } from 'node:test';
import createDefaultAuthProvider from './DefaultAuthProvider.ts';
import { usingModels, setUpMongoFixture } from '../../../test/util-mongo.ts';
import type { Models } from '../../../interface.ts';

const modelsPromise = usingModels();
let models: Models;

before(async () => {
  const { db } = (await modelsPromise).database;
  models = (await modelsPromise).models;
  await setUpMongoFixture(db, ['users']);
});

describe('defaultAuthProvider', () => {
  test('OK', async () => {
    const authProvider = await createDefaultAuthProvider({}, { models });
    assert.partialDeepStrictEqual(
      await authProvider.check('alice@example.com', 'aliceSecret'),
      {
        result: 'OK',
        authenticatedUserEmail: 'alice@example.com'
      }
    );
  });

  test('Invalid password', async () => {
    const authProvider = await createDefaultAuthProvider({}, { models });
    assert.partialDeepStrictEqual(
      await authProvider.check('alice@example.com', 'dummy'),
      { result: 'NG' }
    );
  });

  test('Invalid user', async () => {
    const authProvider = await createDefaultAuthProvider({}, { models });
    assert.partialDeepStrictEqual(
      await authProvider.check('dummy@example.com', 'dummy'),
      { result: 'NG' }
    );
  });
});
