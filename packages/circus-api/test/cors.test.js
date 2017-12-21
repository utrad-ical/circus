import cors from '../src/middleware/cors';
import axios from 'axios';
import { assert } from 'chai';
import { setUpKoa, listenKoa, tearDownKoa } from './test-utils';

describe('cors middleware', function() {
  it('should append CORS header', async function() {
    const app = await setUpKoa(async app => {
      app.use(cors());
      app.use(ctx => {
        ctx.body = 'hi';
      });
    });

    const server = await listenKoa(app);

    const res = await axios.request({
      method: 'get',
      url: server.url
    });

    assert.equal(res.headers['access-control-allow-origin'], '*');
    assert.equal(res.data, 'hi');

    await tearDownKoa(server);
  });
});
