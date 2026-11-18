import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import createServiceLoader from '../../createServiceLoader.ts';
import { setUpMongoFixture, usingModels } from '../../test/util-mongo.ts';
import type { AuthProvider } from '../../interface.ts';

const modelsPromise = usingModels();
before(async () => {
  const { database } = await modelsPromise;
  await setUpMongoFixture(database.db, ['users', 'onetimeUrls']);
});

test('uses the default auth provider when fallback is enabled in the legacy configuration', async () => {
  const { models } = await modelsPromise;
  const unavailable: AuthProvider = {
    check: async () => ({ result: 'NG' }),
    describe: () => 'Test auth provider'
  };
  const createVerifier = async (fallbackToDefault: boolean) => {
    const loader = await createServiceLoader({
      oauthServer: { options: { fallbackToDefault } }
    });
    loader.register('models', async () => models);
    loader.register('authProvider', async () => unavailable);
    return loader.get('verifyUser');
  };

  const withoutFallback = await createVerifier(false);
  assert.equal(await withoutFallback('alice', 'aliceSecret'), null);
  const withFallback = await createVerifier(true);
  const user = await withFallback('alice', 'aliceSecret');
  assert.equal(user?.userEmail, 'alice@example.com');
});
