import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createNullLogger } from '@utrad-ical/circus-lib';
import { createHonoApp } from '../createHonoApp.ts';

const allowedOrigin = 'https://tools.example.org';
const otherOrigin = 'https://other.example.org';
const allowOriginHeader = 'Access-Control-Allow-Origin';

const createApp = async (corsOrigin?: string) => {
  const app = createHonoApp({
    logger: createNullLogger(),
    corsOrigin
  });
  app.get('/api/example', ctx => ctx.text('hi'));
  return app;
};

const preflight = (origin: string) => ({
  method: 'OPTIONS',
  headers: {
    Origin: origin,
    'Access-Control-Request-Method': 'GET',
    'Access-Control-Request-Headers': 'authorization'
  }
});

test('does not enable CORS by default', async () => {
  const app = await createApp();
  const res = await app.request('/api/example', {
    headers: { Origin: allowedOrigin }
  });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get(allowOriginHeader), null);
  assert.equal(await res.text(), 'hi');

  const options = await app.request('/api/example', preflight(allowedOrigin));
  assert.equal(options.status, 404);
  assert.equal(options.headers.get(allowOriginHeader), null);
});

test('allows only the configured origin', async () => {
  const app = await createApp(allowedOrigin);
  const options = await app.request('/api/example', preflight(allowedOrigin));
  assert.equal(options.status, 204);
  assert.equal(options.headers.get(allowOriginHeader), allowedOrigin);
  assert.deepEqual(
    options.headers.get('Access-Control-Allow-Headers')?.split(/,\s*/),
    ['Authorization', 'Content-Type']
  );
  assert.equal(options.headers.get('Access-Control-Allow-Credentials'), 'true');

  const denied = await app.request('/api/example', preflight(otherOrigin));
  assert.equal(denied.headers.get(allowOriginHeader), null);

  const res = await app.request('/api/example', {
    headers: { Origin: allowedOrigin }
  });
  assert.equal(res.headers.get(allowOriginHeader), allowedOrigin);
  assert.equal(res.headers.get('Vary'), 'Origin');
});

test('allows any origin when explicitly configured', async () => {
  const app = await createApp('*');
  const res = await app.request('/api/example', preflight(otherOrigin));
  assert.equal(res.status, 204);
  assert.equal(res.headers.get(allowOriginHeader), '*');
});
