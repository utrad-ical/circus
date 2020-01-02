import * as test from './test-utils';
import createLocker from '../src/db/createLocker';
import delay from '../src/utils/delay';

describe('createLocker', function() {
  let db, dbConnection, locker;

  before(async function() {
    ({ db, dbConnection } = await test.connectMongo());
    await db.collection('locks').deleteMany({});
    locker = await createLocker(db);
  });

  after(async function() {
    if (dbConnection) await dbConnection.close();
  });

  it('should perform locking of one resource', async function() {
    let id;
    for (let i = 0; i <= 2; i++) {
      try {
        id = await locker.lock('orange');
      } finally {
        await locker.unlock(id);
      }
    }
  });

  it('should fail on the second lock trial', async function() {
    await test.asyncThrows(async function() {
      await locker.lock('sapphire');
      await locker.lock('sapphire');
    }, 'Resource busy');
  });

  it('should not fail with a zombie lock', async function() {
    const locker = await createLocker(db, 'locker', 50);
    await locker.lock('passion');
    await delay(100);
    await locker.lock('passion');
  });
});
