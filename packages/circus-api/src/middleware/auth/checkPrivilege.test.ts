import axios, { AxiosInstance } from 'axios';
import { setUpKoaTest, TestServer } from '../../../test/util-koa';
import { connectMongo, setUpMongoFixture } from '../../../test/util-mongo';
import mongo from 'mongodb';
import checkPrivilege from './checkPrivilege';
import createValidator from '../../createValidator';
import createModels from '../../db/createModels';
import { determineUserAccessInfo } from '../../privilegeUtils';
import Router from 'koa-router';

let testServer: TestServer,
  db: mongo.Db,
  dbConnection: mongo.MongoClient,
  userEmail: string,
  ax: AxiosInstance;

beforeAll(async () => {
  ({ db, dbConnection } = await connectMongo());
  await setUpMongoFixture(db, ['groups', 'users', 'projects', 'clinicalCases']);
  const validator = await createValidator();
  const models = createModels(db, validator);
  testServer = await setUpKoaTest(async app => {
    app.use(async (ctx, next) => {
      ctx.user = await models.user.findByIdOrFail(userEmail);
      ctx.userPrivileges = await determineUserAccessInfo(models, ctx.user);
      await next();
    });
    const router = new Router();
    // app.use(async (ctx, next) => {
    // 	try { await next(); } catch (err) { console.log(err); throw err; }
    // });
    router.get(
      '/global',
      checkPrivilege({ models }, { requiredGlobalPrivilege: 'manageServer' }),
      async (ctx, next) => (ctx.body = 'Protected Area')
    );
    router.get(
      '/case/:caseId',
      checkPrivilege({ models }, { requiredProjectPrivilege: 'read' }),
      async (ctx, next) => (ctx.body = 'Protected Area')
    );
    router.get(
      '/project/:projectId',
      checkPrivilege({ models }, { requiredProjectPrivilege: 'read' }),
      async (ctx, next) => (ctx.body = 'Protected Area')
    );
    app.use(router.routes());
  });
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
});

afterAll(async () => {
  await testServer.tearDown();
  await dbConnection.close();
});

describe('global privilege checker', () => {
  it('should pass for user with good global privilege', async () => {
    userEmail = 'alice@example.com';
    const res = await ax.get('global');
    expect(res.data).toBe('Protected Area');
  });

  it('should fail for user with bad global privilege', async () => {
    userEmail = 'bob@example.com';
    const res = await ax.get('global');
    expect(res.status).toBe(401);
  });
});

describe('project privilege checker', () => {
  it('should pass for user with good project privilege', async () => {
    const resource =
      'case/faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';
    userEmail = 'bob@example.com';
    const res = await ax.get(resource);
    expect(res.data).toBe('Protected Area');
  });

  it('should fail for user without a privilege', async () => {
    const resource =
      'case/faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';
    userEmail = 'alice@example.com';
    const res = await ax.get(resource);
    expect(res.status).toBe(401);
  });

  it('should pass for user with good project privilege', async () => {
    const resource = 'project/8883fdef6f5144f50eb2a83cd34baa44';
    userEmail = 'bob@example.com';
    const res = await ax.get(resource);
    expect(res.data).toBe('Protected Area');
  });

  it('should fail for user without a projectprivilege', async () => {
    const resource = 'project/8883fdef6f5144f50eb2a83cd34baa44';
    userEmail = 'alice@example.com';
    const res = await ax.get(resource);
    expect(res.status).toBe(401);
  });
});
