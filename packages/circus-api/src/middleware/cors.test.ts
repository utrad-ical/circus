import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setUpHonoTest } from '../test/util-server.ts';

test('cors', async () => {
  const testServer = await setUpHonoTest(async app => {
    app.get('/', ctx => ctx.text('hi'));
  });

  try {
    const res = await fetch(testServer.url);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    assert.equal(await res.text(), 'hi');
  } finally {
    await testServer.tearDown();
  }
});
