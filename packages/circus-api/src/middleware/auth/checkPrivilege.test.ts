import axios, { AxiosInstance } from 'axios';
import Router from 'koa-router';
import { setUpKoaTest, TestServer } from '../../../test/util-koa';
import { setUpMongoFixture, usingModels } from '../../../test/util-mongo';
import { determineUserAccessInfo } from '../../privilegeUtils';
import checkPrivilege from './checkPrivilege';

let testServer: TestServer, userEmail: string, ax: AxiosInstance;

const modelsPromise = usingModels();

beforeAll(async () => {
  const { db, models } = await modelsPromise;
  await setUpMongoFixture(db, [
    'groups',
    'users',
    'projects',
    'clinicalCases',
    'pluginJobs'
  ]);
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
    router.get(
      '/plugin-jobs/:jobId',
      checkPrivilege({ models }, { requiredSeriesDomainCheck: true }),
      async (ctx, next) => (ctx.body = 'Protected Area')
    );
    app.use(router.routes());
  });
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
});

afterAll(async () => {
  await testServer.tearDown();
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

describe('plugin-job privilege checker', () => {
  it('should pass for user with good plugin-job privilege', async () => {
    const resource = 'plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa';
    userEmail = 'alice@example.com';
    const res = await ax.get(resource);
    expect(res.data).toBe('Protected Area');
  });

  it('should fail for user without a privilege', async () => {
    const resource = 'plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa';
    userEmail = 'bob@example.com';
    const res = await ax.get(resource);
    expect(res.status).toBe(401);
  });
});
