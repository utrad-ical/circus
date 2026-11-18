import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { httpError } from './errorHandler.ts';
import type { TestHttpClient } from '../test/util-http.ts';
import { createTestHttpClient } from '../test/util-http.ts';
import { ValidationError } from '../createValidator.ts';
import type { TestServer } from '../test/util-server.ts';
import { setUpHonoTest } from '../test/util-server.ts';

let testServer: TestServer, ax: TestHttpClient;

before(async () => {
  testServer = await setUpHonoTest(
    async app => {
      app.get('/found', ctx => ctx.text('Hello'));

      const validationError = (phase: 'request' | 'response') => {
        const err = new ValidationError([
          { path: ['a'], message: 'Expected number', code: 'invalid_type' }
        ]);
        err.phase = phase;
        return err;
      };

      app.get('/invalid-on-request', () => {
        throw validationError('request');
      });

      app.get('/invalid-on-response', () => {
        throw validationError('response');
      });

      app.get('/server-side-error', async ctx => {
        return ctx.text((null as any).foo); // intentional run time error
      });

      app.get('/error-403', () => {
        throw httpError(403, 'no!');
      });
    },
    { debug: true }
  );
  ax = createTestHttpClient(testServer.url);
});

after(async () => {
  await testServer.tearDown();
});

test('should return 200 for normal request', async () => {
  const res = await ax.get('found');
  assert.equal(res.status, 200);
});

test('should return 404 for nonexistent path', async () => {
  const res = await ax.get('not-found');
  assert.equal(res.status, 404);
});

test('should return 400 for request validation error', async () => {
  const res = await ax.get('invalid-on-request');
  assert.equal(res.status, 400);
  assert.equal(res.data.error, 'Validation failed.');
  assert.deepEqual(res.data.issues, [
    { path: ['a'], message: 'Expected number' }
  ]);
});

test('should return 500 for server-side validation error', async () => {
  const res = await ax.get('invalid-on-response');
  assert.equal(res.status, 500);
  assert.match(res.data.error, /response schema validation error/i);
});

test('should return 500 for server-side run-time error', async () => {
  const res = await ax.get('server-side-error');
  assert.equal(res.status, 500);
  assert.ok('stack' in res.data);
});

test('should return 403 for server-side access error', async () => {
  const res = await ax.get('error-403');
  assert.equal(res.status, 403);
  assert.match(res.data.error, /no!/);
});
