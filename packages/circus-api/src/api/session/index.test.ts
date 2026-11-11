import assert from 'node:assert/strict';
import { test, before, after, describe } from 'node:test';
import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import httpStatus from 'http-status';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import { sessionClientId } from '../../middleware/auth/session.ts';

let apiTest: ApiTest, ax: AxiosInstance;

before(async () => {
  apiTest = await setUpAppForRoutesTest();
  // A plain client without any credentials
  ax = axios.create({ baseURL: apiTest.url, validateStatus: () => true });
});
after(async () => await apiTest.tearDown());

const csrf = { 'X-Requested-With': 'XMLHttpRequest' };

const sessionCookieOf = (res: AxiosResponse) => {
  const setCookie = (res.headers['set-cookie'] ?? []).find(c =>
    c.startsWith('circus-session=')
  );
  return setCookie;
};

/** Logs in as alice and returns the `Cookie` header value */
const loginAsAlice = async () => {
  const res = await ax.post(
    'api/session',
    { username: 'alice', password: 'aliceSecret' },
    { headers: csrf }
  );
  assert.equal(res.status, httpStatus.NO_CONTENT);
  return sessionCookieOf(res)!.split(';')[0];
};

describe('login', () => {
  test('sets an HttpOnly session cookie', async () => {
    const res = await ax.post(
      'api/session',
      { username: 'alice', password: 'aliceSecret' },
      { headers: csrf }
    );
    assert.equal(res.status, httpStatus.NO_CONTENT);
    const cookie = sessionCookieOf(res)!;
    assert.match(cookie, /^circus-session=[0-9a-f]{40};/);
    assert.match(cookie, /httponly/i);
    assert.match(cookie, /samesite=lax/i);
    // Plain HTTP
    assert.doesNotMatch(cookie, /secure/i);
  });

  test('sets the Secure attribute behind an HTTPS reverse proxy', async () => {
    const res = await ax.post(
      'api/session',
      { username: 'alice', password: 'aliceSecret' },
      { headers: { ...csrf, 'X-Forwarded-Proto': 'https' } }
    );
    assert.equal(res.status, httpStatus.NO_CONTENT);
    assert.match(sessionCookieOf(res)!, /secure/i);
  });

  test('rejects a wrong password', async () => {
    const res = await ax.post(
      'api/session',
      { username: 'alice', password: 'wrong' },
      { headers: csrf }
    );
    assert.equal(res.status, httpStatus.UNAUTHORIZED);
    assert.equal(sessionCookieOf(res), undefined);
  });

  test('rejects a user whose login is disabled', async () => {
    const users = apiTest.database.db.collection('users');
    await users.updateOne(
      { userEmail: 'alice@example.com' },
      { $set: { loginEnabled: false } }
    );
    try {
      const res = await ax.post(
        'api/session',
        { username: 'alice', password: 'aliceSecret' },
        { headers: csrf }
      );
      assert.equal(res.status, httpStatus.UNAUTHORIZED);
    } finally {
      await users.updateOne(
        { userEmail: 'alice@example.com' },
        { $set: { loginEnabled: true } }
      );
    }
  });

  test('requires the CSRF header', async () => {
    const res = await ax.post('api/session', {
      username: 'alice',
      password: 'aliceSecret'
    });
    assert.equal(res.status, httpStatus.FORBIDDEN);
  });

  test('logs in with a onetime password only once', async () => {
    const onetime = { onetime: 'bgticgmjqprbgdundfklfdmbnr' };
    const res1 = await ax.post('api/session', onetime, { headers: csrf });
    assert.equal(res1.status, httpStatus.NO_CONTENT);
    const cookie = sessionCookieOf(res1)!.split(';')[0];
    const info = await ax.get('api/login-info', {
      headers: { Cookie: cookie }
    });
    assert.equal(info.data.userEmail, 'bob@example.com');
    const res2 = await ax.post('api/session', onetime, { headers: csrf });
    assert.equal(res2.status, httpStatus.UNAUTHORIZED);
  });
});

describe('requests with the session cookie', () => {
  test('are authenticated', async () => {
    const cookie = await loginAsAlice();
    const res = await ax.get('api/login-info', { headers: { Cookie: cookie } });
    assert.equal(res.status, httpStatus.OK);
    assert.equal(res.data.userEmail, 'alice@example.com');
  });

  test('need the CSRF header to change data', async () => {
    const cookie = await loginAsAlice();
    const data = { theme: 'mode_white' };
    const res1 = await ax.patch('api/preferences', data, {
      headers: { Cookie: cookie }
    });
    assert.equal(res1.status, httpStatus.FORBIDDEN);
    const res2 = await ax.patch('api/preferences', data, {
      headers: { Cookie: cookie, ...csrf }
    });
    assert.equal(res2.status, httpStatus.NO_CONTENT);
  });

  test('extend the expiration of the session', async () => {
    const cookie = await loginAsAlice();
    const tokens = apiTest.database.db.collection('tokens');
    const accessToken = cookie.split('=')[1];
    const soon = new Date(Date.now() + 60 * 1000);
    await tokens.updateOne(
      { accessToken },
      { $set: { accessTokenExpiresAt: soon } }
    );
    const res = await ax.get('api/login-info', { headers: { Cookie: cookie } });
    assert.equal(res.status, httpStatus.OK);
    const token = await tokens.findOne({ accessToken });
    assert.equal(token!.clientId, sessionClientId);
    assert.ok(
      token!.accessTokenExpiresAt.getTime() >
        Date.now() + 13 * 24 * 60 * 60 * 1000
    );
  });

  test('are rejected if the web UI expects another user', async () => {
    const cookie = await loginAsAlice();
    const res1 = await ax.get('api/login-info', {
      headers: { Cookie: cookie, 'X-Circus-User': 'alice@example.com' }
    });
    assert.equal(res1.status, httpStatus.OK);
    // Another tab has logged in as bob
    const res2 = await ax.get('api/login-info', {
      headers: { Cookie: cookie, 'X-Circus-User': 'bob@example.com' }
    });
    assert.equal(res2.status, httpStatus.CONFLICT);
    assert.equal(res2.headers['x-circus-session-user-changed'], '1');
  });

  test('are rejected after the session expires', async () => {
    const cookie = await loginAsAlice();
    await apiTest.database.db
      .collection('tokens')
      .updateOne(
        { accessToken: cookie.split('=')[1] },
        { $set: { accessTokenExpiresAt: new Date(Date.now() - 1000) } }
      );
    const res = await ax.get('api/login-info', { headers: { Cookie: cookie } });
    assert.equal(res.status, httpStatus.UNAUTHORIZED);
  });
});

describe('logout', () => {
  test('deletes the session and clears the cookie', async () => {
    const cookie = await loginAsAlice();
    const res1 = await ax.delete('api/session', {
      headers: { Cookie: cookie, ...csrf }
    });
    assert.equal(res1.status, httpStatus.NO_CONTENT);
    assert.match(sessionCookieOf(res1)!, /^circus-session=;/);
    const res2 = await ax.get('api/login-info', {
      headers: { Cookie: cookie }
    });
    assert.equal(res2.status, httpStatus.UNAUTHORIZED);
  });
});

describe('RS', () => {
  test('requires authentication', async () => {
    const res = await ax.get('rs/series/111.222.333.444.444/metadata');
    assert.equal(res.status, httpStatus.UNAUTHORIZED);
  });

  test('checks the domain of the series', async () => {
    const cookie = await loginAsAlice();
    // alice can access sirius.org but not vega.org
    const res = await ax.get('rs/series/111.222.333.444.777/metadata', {
      headers: { Cookie: cookie }
    });
    assert.equal(res.status, httpStatus.FORBIDDEN);
    const res2 = await ax.get('rs/series/1.2.3.4.5.6/metadata', {
      headers: { Cookie: cookie }
    });
    assert.equal(res2.status, httpStatus.NOT_FOUND);
  });

  test('accepts a Bearer token or the session cookie', async () => {
    const res1 = await apiTest.axiosInstances.alice.get(
      'rs/series/111.222.333.444.444/metadata'
    );
    assert.equal(res1.status, httpStatus.OK);
    assert.deepEqual(res1.data, { dummy: true });
    const cookie = await loginAsAlice();
    const res2 = await ax.get('rs/series/111.222.333.444.444/metadata', {
      headers: { Cookie: cookie }
    });
    assert.equal(res2.status, httpStatus.OK);
  });
});
