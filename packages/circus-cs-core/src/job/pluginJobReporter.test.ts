import mongo from 'mongodb';
import pluginJobReporter, { PluginJobReporter } from './pluginJobReporter';
import { getTestCollection } from '../testHelper';

describe('pluginJobReporter', () => {
  let client: mongo.MongoClient;
  let collection: mongo.Collection;
  let reporter: PluginJobReporter;

  const jobId = 'aabbcc';

  beforeAll(async () => {
    ({ client, collection } = await getTestCollection('pluginJobs'));
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

  test('report processing', async () => {
    await reporter.report(jobId, 'processing');
    const check = await collection.findOne({ jobId });
    expect(check).toMatchObject({ status: 'processing' });
    expect(check.startedAt).not.toBeFalsy();
  });

  test('report finished', async () => {
    await reporter.report(jobId, 'finished');
    const check = await collection.findOne({ jobId });
    expect(check).toMatchObject({ status: 'finished' });
    expect(check.finishedAt).not.toBeFalsy();
  });

  test('report error', async () => {
    await reporter.report(jobId, 'failed');
    const check = await collection.findOne({ jobId });
    expect(check).toMatchObject({ status: 'failed' });
    expect(check.finishedAt).toBeFalsy();
  });

  test('store results', async () => {
    await reporter.report(jobId, 'results', ['a', 'b', 'c']);
    const check = await collection.findOne({ jobId });
    expect(check.results).toEqual(['a', 'b', 'c']);
  });
});
