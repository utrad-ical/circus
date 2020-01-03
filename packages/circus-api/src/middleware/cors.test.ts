import cors from './cors';
import axios from 'axios';
import { setUpKoaTest } from '../../test/util-koa';

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
    expect(res.headers['access-control-allow-origin']).toBe('*');
    expect(res.data).toBe('hi');
  } finally {
    await testServer.tearDown();
  }
});
