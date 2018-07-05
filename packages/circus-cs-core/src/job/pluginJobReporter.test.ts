import * as mongo from 'mongodb';
import pluginJobReporter, { PluginJobReporter } from './pluginJobReporter';

describe('pluginJobReporter', () => {
  let client: mongo.MongoClient;
  let collection: mongo.Collection;
  let reporter: PluginJobReporter;

  const mongoUrl =
    process.env.CIRCUS_MONGO_TEST_URL ||
    'mongodb://localhost:27017/cs-core-test';
  const collectionName = 'pluginJobs';

  const jobId = 'aabbcc';

  beforeAll(async () => {
    client = await mongo.MongoClient.connect(mongoUrl);
    collection = client.db().collection(collectionName);
    reporter = pluginJobReporter(collection);
  });

  beforeEach(async () => {
    await collection.remove({});
    await collection.insertOne({
      jobId,
      status: 'in_queue',
      payload: { a: 5 }
    });
  });

  afterAll(async () => {
    await client.close(true);
  });

  test('mark the status', async () => {
    await reporter.report(jobId, 'processing');
    const check = await collection.findOne({ jobId });
    expect(check).toMatchObject({ status: 'processing' });
  });

  test('store results', async () => {
    await reporter.report(jobId, 'results', ['a', 'b', 'c']);
    const check = await collection.findOne({ jobId });
    expect(check.results).toEqual(['a', 'b', 'c']);
  });
});
