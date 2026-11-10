import assert from 'node:assert/strict';
import { test, before } from 'node:test';
import { setUpMongoFixture, usingSessionModels } from './test/util-mongo.ts';
import type { Models } from './interface.ts';
import type { UserPrivilegeInfo } from './privilegeUtils.ts';
import {
  determineUserAccessInfo,
  fetchAndLockAccessibleSeries
} from './privilegeUtils.ts';
import type { SeriesEntry } from './typings/circus.ts';

let models: Models;

const modelsPromise = usingSessionModels();

before(async () => {
  const { database, models: m } = await modelsPromise;
  const db = database.db;
  await setUpMongoFixture(db, ['groups', 'users', 'series']);
  models = m;
});

const sameMembers = (test: string[], members: string[]) => {
  assert.equal(test.length, members.length);
  members.forEach(item => assert.equal(test.indexOf(item) >= 0, true));
};

test('determineUserAccessInfo', async () => {
  const alice = await models.user.findByIdOrFail('alice@example.com');
  const privA = await determineUserAccessInfo(models, alice);
  sameMembers(privA.globalPrivileges, [
    'manageServer',
    'personalInfoView',
    'issueOnetime'
  ]);
  sameMembers(privA.domains, ['sirius.org']);
  assert.deepEqual(privA.accessibleProjects, []);
  sameMembers(privA.accessiblePlugins[0].roles, [
    'readPlugin',
    'manageFeedback'
  ]);

  const bob = await models.user.findByIdOrFail('bob@example.com');
  const privB = await determineUserAccessInfo(models, bob);
  sameMembers(privB.globalPrivileges, ['personalInfoView', 'downloadVolume']);
  sameMembers(privB.domains, ['vega.org', 'altair.org']);
  assert.equal(privB.accessibleProjects.length, 1);
  sameMembers(privB.accessibleProjects[0].roles, ['read', 'write', 'moderate']);
  assert.equal(privB.accessiblePlugins.length, 1);
  sameMembers(privB.accessiblePlugins[0].roles, [
    'readPlugin',
    'executePlugin',
    'inputPersonalFeedback'
  ]);

  const guest = await models.user.findByIdOrFail('guest@example.com');
  const privG = await determineUserAccessInfo(models, guest);
  sameMembers(privG.globalPrivileges, []);
  sameMembers(privG.domains, []);
  assert.deepEqual(privG.accessibleProjects, []);
  assert.deepEqual(privG.accessiblePlugins, []);
});

test('fetchAndLockAccessibleSeries', async () => {
  const alice = await models.user.findByIdOrFail('alice@example.com');
  const privA = await determineUserAccessInfo(models, alice);
  const bob = await models.user.findByIdOrFail('bob@example.com');
  const privB = await determineUserAccessInfo(models, bob);
  const guest = await models.user.findByIdOrFail('guest@example.com');
  const privG = await determineUserAccessInfo(models, guest);
  const fetch = (priv: UserPrivilegeInfo, seriesEntries: string[]) =>
    fetchAndLockAccessibleSeries(
      models,
      priv,
      seriesEntries.map(i => {
        const [seriesUid, start, end, delta] = i.split(':');
        return {
          seriesUid,
          partialVolumeDescriptor: {
            start: Number(start),
            end: Number(end),
            delta: Number(delta)
          }
        } as SeriesEntry;
      })
    );
  const checkOk = async (priv: UserPrivilegeInfo, seriesEntries: string[]) => {
    const series = await fetch(priv, seriesEntries);
    assert.equal(seriesEntries.length, series.length);
  };
  const checkNg = async (priv: UserPrivilegeInfo, seriesEntries: string[]) => {
    await assert.rejects(fetch(priv, seriesEntries));
  };
  // 111.222.333.444.444: (  1) [sirius.org] A
  // 111.222.333.444.555: (150) [sirius.org] A
  // 111.222.333.444.666: (100) [sirius.org] A
  // 111.222.333.444.777: (236) [vega.org] B
  await checkOk(privA, [
    '111.222.333.444.444:1:1:1',
    '111.222.333.444.555:1:149:2',
    '111.222.333.444.666:10:20:10'
  ]);
  await checkNg(privA, ['111.222.333.444.444:2:3:1']);
  await checkNg(privA, ['111.222.333.444.777:1:500:1']);
  await checkOk(privB, ['111.222.333.444.777:1:236:1']);
  await checkNg(privB, ['111.222.333.444.555:1:150:1']);
  await checkOk(privG, []);
  await checkNg(privG, ['111.222.333.444.444']);
});
