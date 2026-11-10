import assert from 'node:assert/strict';
import { test } from 'node:test';
import cors from './cors.ts';
import axios from 'axios';
import { setUpKoaTest } from '../test/util-koa.ts';

test('cors', async () => {
  const testServer = await setUpKoaTest(async app => {
    app.use(cors('*'));
    app.use(ctx => {
      ctx.body = 'hi';
    });
  });

  try {
    const res = await axios.request({
      method: 'get',
      url: testServer.url
    });
    assert.equal(res.headers['access-control-allow-origin'], '*');
    assert.equal(res.data, 'hi');
  } finally {
    await testServer.tearDown();
  }
});
