import t from '../../test/test-schemas.ts';
import assert from 'node:assert/strict';
import { test, beforeEach, afterEach } from 'node:test';
import { gzipSync } from 'node:zlib';
import { z } from 'zod';
import { respondJson, validateRequest } from './validateInOut.ts';
import createValidator from '../createValidator.ts';
import { createTestHttpClient } from '../test/util-http.ts';
import type { TestServer } from '../test/util-server.ts';
import { setUpHonoTest } from '../test/util-server.ts';

const exampleJson = '{"intVal":5,"dateVal":"2015-05-05T00:11:22.000Z"}';

let testServer: TestServer;
let client: ReturnType<typeof createTestHttpClient>;

beforeEach(async () => {
  testServer = await setUpHonoTest(async app => {
    const validator = await createValidator(undefined);
    app.post('/api/no-check', ctx => ctx.json({ response: 'OK' }));
    app.post(
      '/api/in-check',
      validateRequest(validator, t.date.required()),
      ctx => ctx.json({ foo: ctx.req.valid('json').dateVal.toISOString() })
    );
    app.post('/api/parse-once', validateRequest(validator, z.unknown()), ctx =>
      ctx.json({ reused: ctx.req.valid('json') === ctx.var.jsonBody })
    );
    app.post('/api/out-check', ctx =>
      respondJson(ctx, validator, t.date, ctx.var.jsonBody)
    );
  });
  client = createTestHttpClient(testServer.url);
});

afterEach(async function () {
  await testServer.tearDown();
});

test('should pass input validation', async function () {
  const res = await client.request({
    url: 'api/in-check',
    method: 'post',
    data: { intVal: 5, dateVal: '2015-05-05T00:11:22.000Z' }
  });
  assert.equal(res.data.foo, '2015-05-05T00:11:22.000Z');
});

test('should fail input validation', async function () {
  const res = await client.request({
    url: 'api/in-check',
    method: 'post',
    data: { intVal: 30, dateVal: 'invalid date' }
  });
  assert.equal(res.status, 400);
});

test('reuses the parsed body for validation', async () => {
  const res = await client.post('api/parse-once', { value: 1 });
  assert.equal(res.status, 200);
  assert.deepEqual(res.data, { reused: true });
});

test('decodes gzip-compressed JSON before validation', async () => {
  const res = await fetch(new URL('api/in-check', testServer.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'Gzip'
    },
    body: new Uint8Array(gzipSync(exampleJson))
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { foo: '2015-05-05T00:11:22.000Z' });
});

test('validates JSON sent without a content length', async () => {
  const init = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(exampleJson));
        controller.close();
      }
    }),
    duplex: 'half' as const
  };
  const res = await fetch(new URL('api/in-check', testServer.url), init);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { foo: '2015-05-05T00:11:22.000Z' });
});

test('applies the JSON size limit after decompression', async () => {
  const res = await fetch(new URL('api/no-check', testServer.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Encoding': 'gzip'
    },
    body: new Uint8Array(
      gzipSync(JSON.stringify({ text: 'a'.repeat(1024 * 1024) }))
    )
  });
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), {
    error: 'Invalid JSON as request body.\nrequest entity too large'
  });
});

test('should pass output validation', async function () {
  const res = await client.post('api/out-check', { intVal: 5 });
  assert.equal(res.status, 200);
});

test('should fail output validation', async function () {
  const res = await client.request({
    url: 'api/out-check',
    method: 'post',
    data: { intVal: 'foo' }
  });
  assert.equal(res.status, 500);
  assert.match(res.data.error, /Response schema validation error/i);
});
