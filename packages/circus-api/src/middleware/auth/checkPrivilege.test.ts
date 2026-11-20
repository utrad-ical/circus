import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';
import type { TestHttpClient } from '../../test/util-http.ts';
import { createTestHttpClient } from '../../test/util-http.ts';
import type { TestServer } from '../../test/util-server.ts';
import { setUpHonoTest } from '../../test/util-server.ts';
import { setUpMongoFixture, usingModels } from '../../test/util-mongo.ts';
import { determineUserAccessInfo } from '../../privilegeUtils.ts';
import checkPrivilege from './checkPrivilege.ts';

let testServer: TestServer, userEmail: string, ax: TestHttpClient;

const modelsPromise = usingModels();

before(async () => {
  const { database, models } = await modelsPromise;
  await setUpMongoFixture(database.db, [
    'groups',
    'users',
    'projects',
    'clinicalCases',
    'pluginJobs',
    'pluginDefinitions',
    'series'
  ]);
  testServer = await setUpHonoTest(async app => {
    app.use(async (ctx, next) => {
      const user = await models.user.findByIdOrFail(userEmail);
      ctx.set('user', user);
      ctx.set('userPrivileges', await determineUserAccessInfo(models, user));
      await next();
    });
    app.get(
      '/global',
      checkPrivilege({ models }, { requiredGlobalPrivilege: 'manageServer' }),
      ctx => ctx.text('Protected Area')
    );
    app.get(
      '/case/:caseId',
      checkPrivilege({ models }, { requiredProjectPrivilege: 'read' }),
      ctx => ctx.text('Protected Area')
    );
    app.get(
      '/project/:projectId',
      checkPrivilege({ models }, { requiredProjectPrivilege: 'read' }),
      ctx => ctx.text('Protected Area')
    );
    app.get(
      '/plugin-jobs/:jobId',
      checkPrivilege(
        { models },
        {
          requiredSeriesDomainCheck: true,
          requiredPluginPrivilege: 'readPlugin'
        }
      ),
      ctx => ctx.text('Protected Area')
    );
  });
  ax = createTestHttpClient(testServer.url);
});

after(async () => {
  await testServer.tearDown();
});

describe('global privilege checker', () => {
  test('allows access with the required global privilege', async () => {
    userEmail = 'alice@example.com';
    const res = await ax.get('global');
    assert.equal(res.data, 'Protected Area');
  });

  test('returns 401 without the required global privilege', async () => {
    userEmail = 'bob@example.com';
    const res = await ax.get('global');
    assert.equal(res.status, 401);
  });
});

describe('project privilege checker', () => {
  test('allows case access with the required project privilege', async () => {
    const resource =
      'case/faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';
    userEmail = 'bob@example.com';
    const res = await ax.get(resource);
    assert.equal(res.data, 'Protected Area');
  });

  test('returns 401 for a case without the required project privilege', async () => {
    const resource =
      'case/faeb503e97f918c882453fd2d789f50f4250267740a0b3fbcc85a529f2d7715b';
    userEmail = 'alice@example.com';
    const res = await ax.get(resource);
    assert.equal(res.status, 401);
  });

  test('allows project access with the required project privilege', async () => {
    const resource = 'project/8883fdef6f5144f50eb2a83cd34baa44';
    userEmail = 'bob@example.com';
    const res = await ax.get(resource);
    assert.equal(res.data, 'Protected Area');
  });

  test('returns 401 for a project without the required project privilege', async () => {
    const resource = 'project/8883fdef6f5144f50eb2a83cd34baa44';
    userEmail = 'alice@example.com';
    const res = await ax.get(resource);
    assert.equal(res.status, 401);
  });
});

describe('plugin-job privilege checker', () => {
  test('allows access to a plug-in job with the required privileges', async () => {
    const resource = 'plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa';
    userEmail = 'alice@example.com';
    const res = await ax.get(resource);
    // console.log(res.data);
    assert.equal(res.data, 'Protected Area');
  });

  test("returns 401 when the user lacks access to the job's series domain", async () => {
    const resource = 'plugin-jobs/01dxgwv3k0medrvhdag4mpw9wa';
    userEmail = 'bob@example.com';
    const res = await ax.get(resource);
    assert.equal(res.status, 401);
    // bob has readPlugin of this plug-in, but not the domain of the series
    assert.match(res.data.error, /privilege to access this plugin-job/);
  });
});
