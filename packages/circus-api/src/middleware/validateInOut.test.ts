import validateInOut from './validateInOut';
import createValidator from '../createValidator';
import bodyParser from 'koa-bodyparser';
import errorHandler from './errorHandler';
import axios from 'axios';
import Router from 'koa-router';
import * as path from 'path';
import { setUpKoaTest, TestServer } from '../../test/util-koa';
import createNullLogger from '@utrad-ical/circus-lib/lib/logger/NullLogger';

let testServer: TestServer;

beforeEach(async () => {
  testServer = await setUpKoaTest(async app => {
    const validator = await createValidator({
      schemaRoot: path.join(__dirname, '../../test/test-schemas')
    });
    const router = new Router();

    router.post(
      '/no-check',
      validateInOut(validator),
      async ctx => (ctx.body = { response: 'OK' })
    );
    router.post(
      '/in-check',
      validateInOut(validator, {
        requestSchema: 'date|allRequired'
      }),
      async ctx => (ctx.body = { foo: ctx.request.body.dateVal.toISOString() })
    );
    router.post(
      '/out-check',
      validateInOut(validator, { responseSchema: 'date' }),
      async ctx => (ctx.body = ctx.request.body)
    );

    app.use(bodyParser());
    app.use(
      errorHandler({
        logger: await createNullLogger(null, {}),
        includeErrorDetails: true
      })
    );
    app.use(router.routes());
  });
});

afterEach(async function() {
  await testServer.tearDown();
});

test('should pass input validation', async function() {
  const res = await axios.request({
    url: testServer.url + 'in-check',
    method: 'post',
    data: { intVal: 5, dateVal: '2015-05-05T00:11:22.000Z' }
  });
  expect(res.data.foo).toBe('2015-05-05T00:11:22.000Z');
});

test('should fail input validation', async function() {
  const res = await axios.request({
    url: testServer.url + 'in-check',
    method: 'post',
    data: { intVal: 30, dateVal: 'invalid date' },
    validateStatus: () => true
  });
  expect(res.status).toBe(400);
});

test('should pass output validation', async function() {
  await axios.request({
    url: testServer.url + 'out-check',
    method: 'post',
    data: { intVal: 5 }
  });
});

test('should fail output validation', async function() {
  const res = await axios.request({
    url: testServer.url + 'out-check',
    method: 'post',
    data: { intVal: 'foo' },
    validateStatus: () => true
  });
  expect(res.status).toBe(500);
  expect(res.data.error).toMatch(/Response schema validation error/i);
});
