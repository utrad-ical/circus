import randomstring from 'randomstring';
import mongo from 'mongodb';

/**
 * Provides dummy DB locking functionality.
 * @example
 * const locker = createLocker(db);
 * let id;
 * try {
 *   id = await locker.lock('<my-resource-id>');
 * } catch (err) {
 *   console.log('This resource is busy, try later.');
 * }
 * try {
 *   // do some work on my-resource
 * } finally {
 *   await locker.unlock(id);
 * }
 */
const createLocker = (
  db: mongo.Db,
  collectionName = 'locks',
  timeout = 300000
) => {
  db.collection(collectionName).createIndex({ target: 1 }, { unique: true });

  const lock = async (target: string) => {
    if (typeof target !== 'string' || !target.length) {
      throw new TypeError('Lock target must be string');
    }
    const now = new Date();
    const minTime = new Date(now.getTime() - timeout);

    const myId = randomstring.generate({ length: 12, charset: 'hex' });
    try {
      await db
        .collection(collectionName)
        .bulkWrite([
          { deleteMany: { filter: { target, createdAt: { $lt: minTime } } } },
          { insertOne: { document: { target, myId, createdAt: now } } }
        ]);
    } catch (err) {
      if (err.code === 11000) {
        throw new Error('Resource busy.');
      } else {
        throw new Error('BulkWrite error.');
      }
    }

    return myId;
  };

  const unlock = async (id: string) =>
    await db.collection(collectionName).deleteMany({ myId: id });

  const unlockAll = async (target: string) =>
    await db.collection(collectionName).deleteMany({ target });

  return { lock, unlock, unlockAll };
};

export default createLocker;
