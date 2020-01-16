import errorHandler from './errorHandler';
import axios, { AxiosInstance } from 'axios';
import Router from 'koa-router';
import Ajv from 'ajv';
import { setUpKoaTest, TestServer } from '../../test/util-koa';
import createNullLogger from '@utrad-ical/circus-lib/lib/logger/NullLogger';

let testServer: TestServer, ax: AxiosInstance;

beforeAll(async () => {
  testServer = await setUpKoaTest(async app => {
    const router = new Router();

    router.get('/found', async ctx => {
      ctx.body = 'Hello';
    });

    router.get('/invalid-on-request', async ctx => {
      const ajv = new Ajv();
      const schema = { $async: true, type: 'number' };
      try {
        await ajv.validate(schema, 'hi'); // validation fails
      } catch (err) {
        err.phase = 'request';
        throw err;
      }
    });

    router.get('/invalid-on-response', async ctx => {
      const ajv = new Ajv();
      const schema = { $async: true, type: 'number' };
      try {
        await ajv.validate(schema, 'hi'); // validation fails
      } catch (err) {
        err.phase = 'response';
        throw err;
      }
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

afterAll(async () => {
  await testServer.tearDown();
});

test('should return 200 for normal request', async () => {
  const res = await ax.get('found');
  expect(res.status).toBe(200);
});

test('should return 404 for nonexistent path', async () => {
  const res = await ax.get('not-found');
  expect(res.status).toBe(404);
});

test('should return 400 for request validation error', async () => {
  const res = await ax.get('invalid-on-request');
  expect(res.status).toBe(400);
  expect(res.data.error).toMatch(/request data is not correct/i);
});

test('should return 500 for server-side validation error', async () => {
  const res = await ax('invalid-on-response');
  expect(res.status).toBe(500);
  expect(res.data.error).toMatch(/response schema validation error/i);
});

test('should return 500 for server-side run-time error', async () => {
  const res = await ax('server-side-error');
  expect(res.status).toBe(500);
  expect(res.data).toHaveProperty('stack');
});

test('should return 403 for server-side access error', async () => {
  const res = await ax.get('error-403');
  expect(res.status).toBe(403);
  expect(res.data.error).toMatch(/no!/);
});
