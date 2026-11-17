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
  assert.equal(res.data.sharedMyLists.length, 1);
});

test('full: my lists shared with a group', async () => {
  // Shares Dave's case list with the group of Bob (2)
  await apiTest.database.db
    .collection('users')
    .updateOne(
      { 'myLists.myListId': '01ezab6xqfac7hvm5s09yw1g1j' },
      { $set: { 'myLists.$.editors': [{ type: 'group', groupId: 2 }] } }
    );
  const res = await axios.get('api/login-info/full');
  assert.ok(
    res.data.sharedMyLists.some(
      (l: any) => l.sharedMyList.myListId === '01ezab6xqfac7hvm5s09yw1g1j'
    )
  );
});
