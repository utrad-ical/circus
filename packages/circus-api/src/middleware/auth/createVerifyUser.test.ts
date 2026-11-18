import assert from 'node:assert/strict';
import { before, test } from 'node:test';
import createServiceLoader from '../../createServiceLoader.ts';
import type { Configuration } from '../../config/default.ts';
import { setUpMongoFixture, usingModels } from '../../test/util-mongo.ts';
import type { AuthProvider } from '../../interface.ts';

const modelsPromise = usingModels();
before(async () => {
  const { database } = await modelsPromise;
  await setUpMongoFixture(database.db, ['users', 'onetimeUrls']);
});

test('uses auth for fallback settings and supports the legacy oauthServer configuration', async () => {
  const { models } = await modelsPromise;
  const unavailable: AuthProvider = {
    check: async () => ({ result: 'NG' }),
    describe: () => 'Test auth provider'
  };
  const createVerifier = async (config: Configuration) => {
    const loader = await createServiceLoader(config);
    loader.register('models', async () => models);
    loader.register('authProvider', async () => unavailable);
    return loader.get('verifyUser');
  };

  const fallback = { options: { fallbackToDefault: true } };
  const withoutFallback = await createVerifier({
    auth: { options: { fallbackToDefault: false } },
    oauthServer: fallback
  });
  assert.equal(await withoutFallback('alice', 'aliceSecret'), null);
  for (const key of ['auth', 'oauthServer']) {
    const withFallback = await createVerifier({ [key]: fallback });
    const user = await withFallback('alice', 'aliceSecret');
    assert.equal(user?.userEmail, 'alice@example.com');
  }
});
