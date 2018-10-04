import { assert } from 'chai';
import createValidator from '../src/createValidator';
import * as test from './test-utils';
import createModels from '../src/db/createModels';
import createOauthServer from '../src/middleware/auth/createOauthServer';
import errorHandler from '../src/middleware/errorHandler';
import bodyparser from 'koa-bodyparser';
import Router from 'koa-router';
import compose from 'koa-compose';
import axios from 'axios';
import * as qs from 'querystring';
import createLogger from '../src/createLogger';

describe('createOauthServer', function() {
  let db, server;

  before(async function() {
    db = await test.connectMongo();
    server = await test.listenKoa(
      await test.setUpKoa(async app => {
        const validator = await createValidator();
        const models = createModels(db, validator);
        const oauth = createOauthServer(models);

        const router = new Router();
        router.post('/token', oauth.token());
        router.get(
          '/data',
          compose([oauth.authenticate(), async ctx => (ctx.body = { a: 100 })])
        );

        app.use(bodyparser());
        app.use(errorHandler({ logger: createLogger() }));
        app.use(router.routes());
      })
    );
    await test.setUpMongoFixture(db, ['users']);
  });

  after(async function() {
    if (server) await test.tearDownKoa(server);
    if (db) await db.close();
  });

  it('should authenticate a request with valid token', async function() {
    const getTokenResult = await axios.request({
      method: 'post',
      url: server.url + 'token',
      data: qs.stringify({
        client_id: 'circus-front',
        client_secret: 'not-a-secret',
        grant_type: 'password',
        username: 'alice',
        password: 'aliceSecret'
      })
    });
    const token = getTokenResult.data.access_token;
    // console.log(token);
    const result = await axios.request({
      url: server.url + 'data',
      method: 'get',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.deepEqual(result.data, { a: 100 });
  });

  it('should reject token request with wrong credential', async function() {
    // wrong password
    const res1 = await axios.request({
      method: 'post',
      url: server.url + 'token',
      data: qs.stringify({
        client_id: 'circus-front',
        client_secret: 'not-a-secret',
        grant_type: 'password',
        username: 'alice',
        password: 'thisPasswordIsWrong'
      }),
      validateStatus: null
    });
    assert.equal(res1.status, 400);

    // nonexistent user
    const res2 = await axios.request({
      method: 'post',
      url: server.url + 'token',
      data: qs.stringify({
        client_id: 'circus-front',
        client_secret: 'not-a-secret',
        grant_type: 'password',
        username: 'charlie',
        password: 'charlieDoesNotExist'
      }),
      validateStatus: null
    });
    assert.equal(res2.status, 400);
  });

  it('should return empty data with a request with invalid token', async function() {
    // no token
    const res1 = await axios.request({
      url: server.url + 'data',
      method: 'get',
      validateStatus: null
    });
    assert.equal(res1.status, 401);

    // wrong token
    const wrongToken = 'PeterPiperPickedAPepper';
    const res2 = await axios.request({
      url: server.url + 'data',
      method: 'get',
      headers: { Authorization: `Bearer ${wrongToken}` },
      validateStatus: false
    });
    assert.equal(res2.status, 401);
  });
});
