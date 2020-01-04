import mongo from 'mongodb';
import { usingMongo } from '../../test/util-mongo';
import delay from '../utils/delay';
import createLocker from './createLocker';

let db: mongo.Db, locker: ReturnType<typeof createLocker>;

const dbPromise = usingMongo();

beforeAll(async () => {
  db = await dbPromise;
  await db.collection('locks').deleteMany({});
  locker = await createLocker(db);
});

it('should perform locking of one resource', async () => {
  for (let i = 0; i <= 2; i++) {
    const id = await locker.lock('orange');
    await locker.unlock(id);
  }
});

it('should fail on the second lock trial', async () => {
  await expect(
    (async () => {
      await locker.lock('sapphire');
      await locker.lock('sapphire');
    })()
  ).rejects.toThrow('Resource busy');
});

it('should not fail with a zombie lock', async () => {
  const locker = await createLocker(db, 'locker', 50);
  await locker.lock('passion');
  await delay(100);
  await locker.lock('passion');
});
