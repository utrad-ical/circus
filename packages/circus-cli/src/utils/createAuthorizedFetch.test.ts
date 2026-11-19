import assert from 'node:assert/strict';
import { test } from 'node:test';
import createAuthorizedFetch from './createAuthorizedFetch.ts';

test('uses the configured API base URL and adds the bearer header', async t => {
  const request = t.mock.method(
    globalThis,
    'fetch',
    async (url: string | URL | Request, init?: RequestInit) => {
      assert.equal(String(url), 'https://example.test/circus/api/cases');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('Authorization'), 'Bearer test-token');
      assert.equal(headers.get('Accept'), 'application/json');
      return Response.json([]);
    }
  );
  const fetch = createAuthorizedFetch(
    'test-token',
    'https://example.test/circus/api/'
  );
  const res = await fetch('cases', { headers: { Accept: 'application/json' } });
  assert.deepEqual(await res.json(), []);
  assert.equal(request.mock.callCount(), 1);
});

test('rejects another origin before making an authenticated request', async t => {
  const request = t.mock.method(globalThis, 'fetch', async () =>
    assert.fail('Unexpected request')
  );
  const fetch = createAuthorizedFetch(
    'test-token',
    'https://example.test/api/'
  );

  await assert.rejects(
    fetch('https://another.test/api/cases'),
    /on the API server/
  );
  assert.equal(request.mock.callCount(), 0);
});
