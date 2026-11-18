import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { test, before, after } from 'node:test';
import WebSocket from 'ws';
import type { TestHttpClient } from '../../test/util-http.ts';
import { createTestHttpClient } from '../../test/util-http.ts';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import httpStatus from 'http-status';

let apiTest: ApiTest, client: TestHttpClient;
before(async () => {
  apiTest = await setUpAppForRoutesTest({
    rsWebsocketVolumeConnectionHandlerCreator:
      ({ authFunctionProvider }) =>
      async (socket, request) => {
        const allowed = authFunctionProvider(request);
        socket.send(
          JSON.stringify([
            await allowed('111.222.333.444.444'),
            await allowed('111.222.333.444.777')
          ])
        );
      }
  });
  client = apiTest.clients.alice;
});
after(async () => await apiTest.tearDown());

test('Create / search / delete token', async () => {
  const res1 = await client.post('/api/tokens', { description: 'stella' });
  assert.equal(res1.status, httpStatus.CREATED);
  const tokenId = res1.data.tokenId;
  const keyClient = createTestHttpClient(apiTest.url, {
    Authorization: `Bearer ${res1.data.accessToken}`
  });
  assert.equal((await keyClient.get('/api/login-info')).status, httpStatus.OK);

  const res2 = await client.get('/api/tokens');
  assert.equal(res2.status, httpStatus.OK);
  // partialDeepStrictEqual allows extra array elements, unlike toMatchObject
  assert.equal(res2.data.items.length, 1);
  assert.partialDeepStrictEqual(res2.data, {
    items: [{ description: 'stella' }]
  });

  // Others cannot delete it
  const res3 = await apiTest.clients.bob.delete(`/api/tokens/${tokenId}`);
  assert.equal(res3.status, httpStatus.NOT_FOUND);

  const res4 = await client.delete(`/api/tokens/${tokenId}`);
  assert.equal(res4.status, httpStatus.NO_CONTENT);
  assert.equal(
    (await keyClient.get('/api/login-info')).status,
    httpStatus.UNAUTHORIZED
  );

  const res5 = await client.delete(`/api/tokens/${tokenId}`);
  assert.equal(res5.status, httpStatus.NOT_FOUND);
});

test('authenticates an existing API key over HTTP and RS WebSocket', async () => {
  const accessToken = randomBytes(20).toString('hex');
  const permanentTokenId = randomBytes(20).toString('hex');
  const expires = new Date('2100-12-31T00:00:00');
  const tokens = apiTest.database.db.collection('tokens');
  await tokens.insertOne({
    accessToken,
    accessTokenExpiresAt: expires,
    clientId: 'CIRCUS Front UI',
    refreshToken: randomBytes(20).toString('hex'),
    refreshTokenExpiresAt: expires,
    userId: 'alice@example.com',
    permanentTokenId,
    permanentTokenDescription: 'Existing API key',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const keyClient = createTestHttpClient(apiTest.url, {
    Authorization: `Bearer ${accessToken}`
  });
  const info = await keyClient.get('/api/login-info', {
    headers: {
      Cookie: 'circus-session=stale',
      'X-Circus-User': 'bob@example.com'
    }
  });
  assert.equal(info.status, httpStatus.OK);
  assert.equal(info.data.userEmail, 'alice@example.com');
  assert.equal(
    (await keyClient.get('/api/admin/groups')).status,
    httpStatus.OK
  );

  const url = new URL('rs/ws/volume', apiTest.url);
  url.protocol = 'ws:';
  url.searchParams.set('token', accessToken);
  const volumeAccess = async () => {
    const socket = new WebSocket(url);
    try {
      const [message] = await once(socket, 'message');
      return JSON.parse(message.toString());
    } finally {
      if (socket.readyState !== WebSocket.CLOSED) {
        const closed = once(socket, 'close');
        socket.close();
        await closed;
      }
    }
  };
  assert.deepEqual(await volumeAccess(), [true, false]);

  await tokens.updateOne(
    { permanentTokenId },
    { $set: { accessTokenExpiresAt: new Date(0) } }
  );
  const expired = await keyClient.get('/api/login-info');
  assert.equal(expired.status, httpStatus.UNAUTHORIZED);
  assert.match(expired.data.error, /expired/);
  assert.deepEqual(await volumeAccess(), [false, false]);
});
