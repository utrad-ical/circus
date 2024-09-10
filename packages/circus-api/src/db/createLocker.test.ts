import { usingMongo } from '../test/util-mongo';
import delay from '../utils/delay';
import createLocker from './createLocker';
import mongo from 'mongodb';

let db: mongo.Db, locker: ReturnType<typeof createLocker>;
let disposeMongo: () => Promise<void>;
const dbPromise = usingMongo();

beforeAll(async () => {
  db = (await dbPromise).database.db;
  disposeMongo = (await dbPromise).dispose;
  await db.collection('locks').deleteMany({});
  locker = await createLocker(db);
});

afterAll(async () => {
  await disposeMongo();
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
