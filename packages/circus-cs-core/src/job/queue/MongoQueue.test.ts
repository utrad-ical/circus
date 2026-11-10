import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';
import type * as mongo from 'mongodb';
import { testClientPool } from '../../testHelper.ts';
import type { MongoClientPool } from '../../mongoClientPool.ts';
import createMongoQueue from './MongoQueue.ts';
import type * as circus from '../../interface.ts';

describe('Queue system: Mongo', () => {
  let mongoClientPool: MongoClientPool;
  let collection: mongo.Collection;
  let queue: circus.Queue<any>;
  const collectionName = 'pluginJobQueue';

  before(async () => {
    mongoClientPool = await testClientPool();
  });

  beforeEach(async () => {
    collection = (await mongoClientPool.connect('dummy'))
      .db()
      .collection('pluginJobQueue');
    await collection.deleteMany({});
    queue = await createMongoQueue({ collectionName }, { mongoClientPool });
  });

  after(async () => {
    await mongoClientPool.dispose();
  });

  test('insert a job and list it', async () => {
    await queue.enqueue('abcde', { a: 5 }, 0);
    const item = await queue.dequeue();
    assert.partialDeepStrictEqual(item, { payload: { a: 5 } });
  });

  test('insert multiple jobs with priority', async () => {
    await queue.enqueue('first', { a: 5 }, 0);
    await queue.enqueue('third', { a: 7 }, 0);
    await queue.enqueue('second', { a: 8 }, 1);
    const item1 = await queue.dequeue();
    const item2 = await queue.dequeue();
    const item3 = await queue.dequeue();
    const item4 = await queue.dequeue();
    assert.partialDeepStrictEqual(item1, { payload: { a: 8 } });
    assert.partialDeepStrictEqual(item2, { payload: { a: 5 } });
    assert.partialDeepStrictEqual(item3, { payload: { a: 7 } });
    assert.equal(item4, null);
  });

  test('mark job as finished', async () => {
    await queue.enqueue('first', { a: 5 }, 0);
    await queue.dequeue();
    await queue.settle('first');
    const rows = await collection.find({}).toArray();
    assert.equal(rows.length, 0);
  });

  test('throws if tried to settle a job before dequeue', async () => {
    await queue.enqueue('first', { a: 5 }, 0);
    await assert.rejects(queue.settle('first'), {
      message: /before it gets started/
    });
  });
});
