import * as q from './queue';
import * as mongo from 'mongodb';
import { getTestCollection } from '../testHelper';

describe('Queue system: Mongo', () => {
  let client: mongo.MongoClient;
  let collection: mongo.Collection;
  let queue: q.QueueSystem<any>;

  beforeAll(async () => {
    ({ client, collection } = await getTestCollection('pluginJobQueue'));
    queue = await q.craeteMongoQueue({ collection });
  });

  beforeEach(async () => {
    await collection.remove({});
  });

  afterAll(async () => {
    await client.close(true);
  });

  test('insert a job and list it', async () => {
    await queue.enqueue('abcde', { a: 5 }, 0);
    const item = await queue.dequeue();
    expect(item).toMatchObject({ payload: { a: 5 } });
  });

  test('insert multiple jobs with priority', async () => {
    await queue.enqueue('first', { a: 5 }, 0);
    await queue.enqueue('third', { a: 7 }, 0);
    await queue.enqueue('second', { a: 8 }, 1);
    const item1 = await queue.dequeue();
    const item2 = await queue.dequeue();
    const item3 = await queue.dequeue();
    const item4 = await queue.dequeue();
    expect(item1).toMatchObject({ payload: { a: 8 } });
    expect(item2).toMatchObject({ payload: { a: 5 } });
    expect(item3).toMatchObject({ payload: { a: 7 } });
    expect(item4).toBeNull();
  });

  test('mark job as finished', async () => {
    await queue.enqueue('first', { a: 5 }, 0);
    await queue.dequeue();
    await queue.settle('first');
    const rows = await collection.find({}).toArray();
    expect(rows).toHaveLength(0);
  });

  test('throws if tried to settle a job before dequeue', async () => {
    await queue.enqueue('first', { a: 5 }, 0);
    await expect(queue.settle('first')).rejects.toThrow(
      'before it gets started'
    );
  });
});
