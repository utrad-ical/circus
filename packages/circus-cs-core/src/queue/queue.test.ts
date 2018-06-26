import * as q from './queue';
import * as mongo from 'mongodb';

describe('Queue system: Mongo', () => {
  let client: mongo.MongoClient;
  let collection: mongo.Collection;
  let queue: q.QueueSystem<any>;

  const mongoUrl =
    process.env.CIRCUS_MONGO_TEST_URL ||
    'mongodb://localhost:27017/cs-core-test';
  const collectionName = 'pluginJobQueue';

  beforeAll(async () => {
    client = await mongo.MongoClient.connect(mongoUrl);
    collection = client.db().collection(collectionName);
    await collection.remove({});
    queue = await q.craeteMongoQueue({ collection });
  });

  afterAll(async () => {
    await client.close(true);
  });

  test('insert a job and list it', async () => {
    const item = q.createItem('abcde', { a: 5 }, 0);
    await queue.enqueue(item);
    const next = await queue.dequeue();
    expect(next).toMatchObject({ payload: { a: 5 } });
  });
});
