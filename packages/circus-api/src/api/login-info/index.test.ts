import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import type { ApiTest } from '../../test/util-routes.ts';
import { setUpAppForRoutesTest } from '../../test/util-routes.ts';
import type { AxiosInstance } from 'axios';

let apiTest: ApiTest, axios: AxiosInstance;
before(async () => {
  apiTest = await setUpAppForRoutesTest();
  axios = apiTest.axiosInstances.bob;
});
after(async () => await apiTest.tearDown());

test('short', async () => {
  const res = await axios.get('api/login-info');
  assert.deepEqual(res.data, {
    userEmail: 'bob@example.com',
    loginId: 'bob'
  });
});

test('full', async () => {
  const res = await axios.get('api/login-info/full');
  assert.partialDeepStrictEqual(res.data, {
    userEmail: 'bob@example.com',
    loginId: 'bob',
    description: 'Bob'
  });
  assert.equal(res.data.myLists.length, 4);
  assert.deepEqual(
    res.data.sharedMyLists.map((l: any) => l.owner),
    ['dave@example.com']
  );
});

test('full: my lists shared with a group', async () => {
  // Shares Dave's case list with the group of Bob (2)
  // (instead of Bob himself)
  await apiTest.database.db
    .collection('myLists')
    .updateOne(
      { myListId: '01ezab6xqfac7hvm5s09yw1g1j' },
      { $set: { editors: [{ type: 'group', groupId: 2 }] } }
    );
  const res = await axios.get('api/login-info/full');
  assert.ok(
    res.data.sharedMyLists.some(
      (l: any) => l.sharedMyList.myListId === '01ezab6xqfac7hvm5s09yw1g1j'
    )
  );
});
