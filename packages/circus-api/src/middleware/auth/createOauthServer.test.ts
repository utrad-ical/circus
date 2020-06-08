import axios, { AxiosInstance } from 'axios';
import bodyparser from 'koa-bodyparser';
import Router from 'koa-router';
import * as qs from 'querystring';
import { setUpKoaTest, TestServer } from '../../../test/util-koa';
import { setUpMongoFixture, usingModels } from '../../../test/util-mongo';
import errorHandler from '../errorHandler';
import createOauthServer from './createOauthServer';
import createNullLogger from '@utrad-ical/circus-lib/src/logger/NullLogger';

let testServer: TestServer, ax: AxiosInstance;

const modelsPromise = usingModels();

beforeAll(async () => {
  const { db, models } = await modelsPromise;
  testServer = await setUpKoaTest(async app => {
    const oauth = createOauthServer(models);

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
  await setUpMongoFixture(db, ['users']);
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
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
