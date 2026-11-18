import assert from 'node:assert/strict';
import { test } from 'node:test';
import cors from './cors.ts';
import { setUpKoaTest } from '../test/util-koa.ts';

test('cors', async () => {
  const testServer = await setUpKoaTest(async app => {
    app.use(cors('*'));
    app.use(ctx => {
      ctx.body = 'hi';
    });
  });

  try {
    const res = await fetch(testServer.url);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.equal(await res.text(), 'hi');
  } finally {
    await testServer.tearDown();
  }
});
