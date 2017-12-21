import randomstring from 'randomstring';

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
export default async function createLocker(
  db,
  collectionName = 'locks',
  timeout = 300000
) {
  db.collection(collectionName).ensureIndex({ target: 1 }, { unique: true });

  async function lock(target) {
    if (typeof target !== 'string' || !target.length) {
      throw new TypeError('Lock target must be string');
    }
    const now = new Date();
    const minTime = new Date(now.getTime() - timeout);

    const myId = randomstring.generate({ length: 12, charset: 'hex' });
    const res = await db
      .collection(collectionName)
      .bulkWrite([
        { deleteMany: { filter: { target, createdAt: { $lt: minTime } } } },
        { insertOne: { document: { target, myId, createdAt: now } } }
      ]);
    // Check the raw bulkWrite result and see if there is any error
    const errors = res.getRawResponse().writeErrors;
    if (errors.length) {
      if (errors[0].code === 11000) {
        throw new Error('Resource busy.');
      } else {
        throw new Error('BulkWrite error');
      }
    }

    return myId;
  }

  async function unlock(id) {
    await db.collection(collectionName).deleteMany({ myId: id });
  }

  async function unlockAll(target) {
    await db.collection(collectionName).deleteMany({ target });
  }

  return { lock, unlock, unlockAll };
}
