import { describe, it, before, after } from 'node:test';
import { expect } from 'expect';
import type { AxiosInstance } from 'axios';
import axios from 'axios';
import Router from 'koa-router';
import type { TestServer } from '../../test/util-koa.ts';
import { setUpKoaTest } from '../../test/util-koa.ts';
import { setUpMongoFixture, usingModels } from '../../test/util-mongo.ts';
import { determineUserAccessInfo } from '../../privilegeUtils.ts';
import checkPrivilege from './checkPrivilege.ts';

let testServer: TestServer, userEmail: string, ax: AxiosInstance;

const modelsPromise = usingModels();

before(async () => {
  const { database, models } = await modelsPromise;
  await setUpMongoFixture(database.db, [
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
      checkPrivilege(
        { models },
        {
          requiredSeriesDomainCheck: true,
          requiredPluginPrivilege: 'readPlugin'
        }
      ),
      async (ctx, next) => (ctx.body = 'Protected Area')
    );
    app.use(router.routes());
  });
  ax = axios.create({ baseURL: testServer.url, validateStatus: () => true });
});

after(async () => {
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
  it('should pass for user without a privilege', async () => {
    const resource = 'plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa';
    userEmail = 'alice@example.com';
    const res = await ax.get(resource);
    // console.log(res.data);
    expect(res.data).toBe('Protected Area');
  });

  it('should fail for user without a privilege', async () => {
    const resource = 'plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa';
    userEmail = 'bob@example.com';
    const res = await ax.get(resource);
    expect(res.status).toBe(401);
  });
});
