import { assert } from 'chai';
import * as test from './test-utils';
import createValidator from '../src/createValidator';
import createModels from '../src/db/createModels';
import {
  determineUserAccessInfo,
  fetchAccessibleSeries
} from '../src/privilegeUtils';

describe('checkGlobalPrivileges middleware', function() {
  let db, models;

  before(async function() {
    db = await test.connectMongo();
    await test.setUpMongoFixture(db, ['groups', 'users', 'series']);
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

  it('fetchAccessibleSeries', async function() {
    const alice = await models.user.findByIdOrFail('alice@example.com');
    const privA = await determineUserAccessInfo(models, alice);
    const bob = await models.user.findByIdOrFail('bob@example.com');
    const privB = await determineUserAccessInfo(models, bob);
    const guest = await models.user.findByIdOrFail('guest@example.com');
    const privG = await determineUserAccessInfo(models, guest);
    const fetch = async (priv, seriesEntries) =>
      await fetchAccessibleSeries(
        models,
        priv,
        seriesEntries.map(i => {
          const [seriesUid, start, end, delta] = i.split(':');
          if (start) {
            return {
              seriesUid,
              partialVolumeDescriptor: {
                start: Number(start),
                end: Number(end),
                delta: Number(delta)
              }
            };
          } else {
            return { seriesUid };
          }
        })
      );
    const checkOk = async (priv, seriesEntries) => {
      const series = await fetch(priv, seriesEntries);
      assert.equal(seriesEntries.length, series.length);
    };
    const checkNg = async (priv, seriesEntries) => {
      try {
        await fetch(priv, seriesEntries);
        assert.equal(true, false);
      } catch (er) {
        assert.equal(true, true);
      }
    };
    // 111.222.333.444.444: (  1) [sirius.org] A
    // 111.222.333.444.555: (150) [sirius.org] A
    // 111.222.333.444.666: (100) [sirius.org] A
    // 111.222.333.444.777: (236) [vega.org] B
    await checkOk(privA, [
      '111.222.333.444.444:1:1:0',
      '111.222.333.444.555',
      '111.222.333.444.666:10:20:200'
    ]);
    await checkNg(privA, ['111.222.333.444.444:2:3:1']);
    await checkNg(privA, ['111.222.333.444.777']);
    // await checkNg(privA, ['111.222.333.444.777']);
    await checkOk(privB, ['111.222.333.444.777']);
    await checkNg(privB, ['111.222.333.444.555', '111.222.333.444.777']);
    await checkOk(privG, []);
    await checkNg(privG, ['111.222.333.444.444']);
  });
});
