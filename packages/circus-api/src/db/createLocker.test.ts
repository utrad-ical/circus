import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import { usingMongo } from '../test/util-mongo.ts';
import delay from '../utils/delay.ts';
import createLocker from './createLocker.ts';
import type * as mongo from 'mongodb';

let db: mongo.Db, locker: ReturnType<typeof createLocker>;
let disposeMongo: () => Promise<void>;
const dbPromise = usingMongo();

before(async () => {
  db = (await dbPromise).database.db;
  disposeMongo = (await dbPromise).dispose;
  await db.collection('locks').deleteMany({});
  locker = await createLocker(db);
});

after(async () => {
  await disposeMongo();
});

test('acquires a lock again after releasing it', async () => {
  for (let i = 0; i <= 2; i++) {
    const id = await locker.lock('orange');
    await locker.unlock(id);
  }
});

test('rejects a second lock on the same resource', async () => {
  await assert.rejects(
    (async () => {
      await locker.lock('sapphire');
      await locker.lock('sapphire');
    })(),
    { message: /Resource busy/ }
  );
});

test('acquires the lock after the previous lock expires', async () => {
  const locker = await createLocker(db, 'locker', 50);
  await locker.lock('passion');
  await delay(100);
  await locker.lock('passion');
});
