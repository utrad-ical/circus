import { setUpMongoFixture, usingMongo } from '../test/util-mongo';
import createValidator from './createValidator';
import createModels, { Models } from './db/createModels';
import {
  determineUserAccessInfo,
  fetchAccessibleSeries,
  UserPrivilegeInfo
} from './privilegeUtils';
import { SeriesEntry } from './typings/circus';

let models: Models;

const dbPromise = usingMongo();

beforeAll(async () => {
  const db = await dbPromise;
  await setUpMongoFixture(db, ['groups', 'users', 'series']);
  const validator = await createValidator(undefined);
  models = await createModels(undefined, { db, validator });
});

const sameMembers = (test: string[], members: string[]) => {
  expect(test.length).toBe(members.length);
  members.forEach(item => expect(test.indexOf(item) >= 0).toBe(true));
};

test('determineUserAccessInfo', async () => {
  const alice = await models.user.findByIdOrFail('alice@example.com');
  const privA = await determineUserAccessInfo(models, alice);
  sameMembers(privA.globalPrivileges, ['manageServer', 'personalInfoView']);
  sameMembers(privA.domains, ['sirius.org']);
  expect(privA.accessibleProjects).toEqual([]);

  const bob = await models.user.findByIdOrFail('bob@example.com');
  const privB = await determineUserAccessInfo(models, bob);
  sameMembers(privB.globalPrivileges, ['personalInfoView']);
  sameMembers(privB.domains, ['vega.org', 'altair.org']);
  expect(privB.accessibleProjects).toHaveLength(1);
  sameMembers(privB.accessibleProjects[0].roles, ['read', 'write']);

  const guest = await models.user.findByIdOrFail('guest@example.com');
  const privG = await determineUserAccessInfo(models, guest);
  sameMembers(privG.globalPrivileges, []);
  sameMembers(privG.domains, []);
  expect(privG.accessibleProjects).toEqual([]);
});

test('fetchAccessibleSeries', async () => {
  const alice = await models.user.findByIdOrFail('alice@example.com');
  const privA = await determineUserAccessInfo(models, alice);
  const bob = await models.user.findByIdOrFail('bob@example.com');
  const privB = await determineUserAccessInfo(models, bob);
  const guest = await models.user.findByIdOrFail('guest@example.com');
  const privG = await determineUserAccessInfo(models, guest);
  const fetch = (priv: UserPrivilegeInfo, seriesEntries: string[]) =>
    fetchAccessibleSeries(
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
    expect(seriesEntries.length).toBe(series.length);
  };
  const checkNg = async (priv: UserPrivilegeInfo, seriesEntries: string[]) => {
    await expect(fetch(priv, seriesEntries)).rejects.toThrow();
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
