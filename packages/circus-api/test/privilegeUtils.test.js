import { assert } from 'chai';
import * as test from './test-utils';
import createValidator from '../src/createValidator';
import createModels from '../src/db/createModels';
import { determineUserAccessInfo } from '../src/privilegeUtils';

describe('checkGlobalPrivileges middleware', function() {
  let db, models;

  before(async function() {
    db = await test.connectMongo();
    await test.setUpMongoFixture(db, ['groups', 'users']);
    const validator = await createValidator();
    models = createModels(db, validator);
  });

  after(async function() {
    if (db) await db.close();
  });

  it('determineUserAccessInfo', async function() {
    const alice = await models.user.findByIdOrFail('alice@example.com');
    const privA = await determineUserAccessInfo(models, alice);
    assert.sameMembers(privA.globalPrivileges, [
      'manageServer',
      'personalInfoView'
    ]);
    assert.sameMembers(privA.domains, ['sirius.org']);
    assert.deepEqual(privA.accessibleProjects, []);

    const bob = await models.user.findByIdOrFail('bob@example.com');
    const privB = await determineUserAccessInfo(models, bob);
    assert.sameMembers(privB.globalPrivileges, ['personalInfoView']);
    assert.sameMembers(privB.domains, ['vega.org', 'altair.org']);
    assert.equal(privB.accessibleProjects.length, 1);
    assert.sameMembers(privB.accessibleProjects[0].roles, ['read', 'write']);

    const guest = await models.user.findByIdOrFail('guest@example.com');
    const privG = await determineUserAccessInfo(models, guest);
    assert.sameMembers(privG.globalPrivileges, []);
    assert.sameMembers(privG.domains, []);
    assert.deepEqual(privG.accessibleProjects, []);
  });
});
