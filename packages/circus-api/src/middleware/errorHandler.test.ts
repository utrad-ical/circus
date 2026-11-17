import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import errorHandler from './errorHandler.ts';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import Router from 'koa-router';
import { ValidationError } from '../createValidator.ts';
import type { TestServer } from '../test/util-koa.ts';
import { setUpKoaTest } from '../test/util-koa.ts';
import { createNullLogger } from '@utrad-ical/circus-lib';

let testServer: TestServer, ax: AxiosInstance;

before(async () => {
  testServer = await setUpKoaTest(async app => {
    const router = new Router();

    router.get('/found', async ctx => {
      ctx.body = 'Hello';
    });

    const validationError = (phase: 'request' | 'response') => {
      const err = new ValidationError([
        { path: ['a'], message: 'Expected number', code: 'invalid_type' }
      ]);
      err.phase = phase;
      return err;
    };

    router.get('/invalid-on-request', async ctx => {
      throw validationError('request');
    });

    router.get('/invalid-on-response', async ctx => {
      throw validationError('response');
    });

    router.get('/server-side-error', async ctx => {
      ctx.body = (null as any).foo; // intentional run time error
    });

    router.get('/error-403', async ctx => {
      ctx.throw(403, 'no!');
    });

    app.use(
      errorHandler({
        includeErrorDetails: true,
        logger: await createNullLogger(null, {})
      })
    );
    app.use(router.routes());
  });
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
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
  const res = await ax('invalid-on-response');
  assert.equal(res.status, 500);
  assert.match(res.data.error, /response schema validation error/i);
});

test('should return 500 for server-side run-time error', async () => {
  const res = await ax('server-side-error');
  assert.equal(res.status, 500);
  assert.ok('stack' in res.data);
});

test('should return 403 for server-side access error', async () => {
  const res = await ax.get('error-403');
  assert.equal(res.status, 403);
  assert.match(res.data.error, /no!/);
});
