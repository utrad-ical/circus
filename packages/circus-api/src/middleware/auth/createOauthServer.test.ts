import type { AxiosInstance } from 'axios';
import axios from 'axios';
import bodyparser from 'koa-bodyparser';
import Router from 'koa-router';
import * as qs from 'querystring';
import type { TestServer } from '../../test/util-koa.ts';
import { setUpKoaTest } from '../../test/util-koa.ts';
import { setUpMongoFixture, usingModels } from '../../test/util-mongo.ts';
import errorHandler from '../errorHandler.ts';
import createOauthServer from './createOauthServer.ts';
import createNullLogger from '@utrad-ical/circus-lib/src/logger/NullLogger';
import DefaultAuthProvider from '../auth/authProvider/DefaultAuthProvider.ts';
import type { Models } from '../../interface.ts';
import type { Db } from 'mongodb';

let testServer: TestServer, ax: AxiosInstance, db: Db, models: Models;

const modelsPromise = usingModels();

beforeAll(async () => {
  const { database, models } = await modelsPromise;
  db = database.db;
  const authProvider = await DefaultAuthProvider({}, { models });
  testServer = await setUpKoaTest(async app => {
    const oauth = await createOauthServer(
      {},
      { models, authProvider, defaultAuthProvider: authProvider }
    );

    const router = new Router();
    router.post('/token', oauth.token(null) as any);
    router.get(
      '/data',
      oauth.authenticate(null),
      async ctx => (ctx.body = { a: 100 })
    );

    app.use(bodyparser());
    app.use(
      errorHandler({
        includeErrorDetails: false,
        logger: await createNullLogger(null, {})
      })
    );
    app.use(router.routes());
  });
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
});

beforeEach(async () => {
  await setUpMongoFixture(db, ['users', 'onetimeUrls']);
});

afterAll(async () => {
  testServer.tearDown();
});

it('should authenticate a request with valid token', async () => {
  const getTokenResult = await ax.request({
    method: 'post',
    url: 'token',
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
  const result = await ax.get('data', {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(result.data).toMatchObject({ a: 100 });
});

it('should reject token request with wrong credential', async () => {
  // wrong password
  const res1 = await ax.post('token', {
    data: qs.stringify({
      client_id: 'circus-front',
      client_secret: 'not-a-secret',
      grant_type: 'password',
      username: 'alice',
      password: 'thisPasswordIsWrong'
    })
  });
  expect(res1.status).toBe(400);

  // nonexistent user
  const res2 = await ax.post('token', {
    data: qs.stringify({
      client_id: 'circus-front',
      client_secret: 'not-a-secret',
      grant_type: 'password',
      username: 'charlie',
      password: 'charlieDoesNotExist'
    })
  });
  expect(res2.status).toBe(400);
});

it('should return empty data with a request with invalid token', async () => {
  // no token
  const res1 = await ax.get('data');
  expect(res1.status).toBe(401);

  // wrong token
  const wrongToken = 'PeterPiperPickedAPepper';
  const res2 = await ax.get('data', {
    headers: { Authorization: `Bearer ${wrongToken}` }
  });
  expect(res2.status).toBe(401);
});

it('onetime URL', async () => {
  const res = await ax.request({
    method: 'POST',
    url: 'token',
    data: qs.stringify({
      client_id: 'circus-front',
      client_secret: 'not-a-secret',
      grant_type: 'password',
      username: 'bgticgmjqprbgdundfklfdmbnr',
      password: 'bgticgmjqprbgdundfklfdmbnr'
    })
  });
  expect(res.status).toBe(200);
});
