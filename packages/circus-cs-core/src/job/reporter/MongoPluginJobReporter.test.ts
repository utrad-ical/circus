import mongo from 'mongodb';
import createMongoPluginJobReporter from './MongoPluginJobReporter';
import { testClientPool } from '../../testHelper';
import { MongoClientPool } from '../../mongoClientPool';
import tar from 'tar-stream';
import fs from 'fs-extra';
import path from 'path';

describe('pluginJobReporter', () => {
  let mongoClientPool: MongoClientPool;
  let collection: mongo.Collection;
  let reporter: circus.PluginJobReporter;

  const jobId = 'aabbcc';
  const collectionName = 'pluginJobs';
  const resultsDirectory = path.resolve(__dirname, '../../../test');

  beforeAll(async () => {
    mongoClientPool = await testClientPool();
    collection = (await mongoClientPool.connect('dummy'))
      .db()
      .collection(collectionName);
    reporter = await createMongoPluginJobReporter(
      { mongoUrl: 'dummy', collectionName, resultsDirectory },
      { mongoClientPool }
    );
  });

  beforeEach(async () => {
    await collection.deleteMany({});
    await collection.insertOne({
      jobId,
      status: 'in_queue',
      payload: { a: 5 }
    });
  });

  afterAll(async () => {
    await mongoClientPool.dispose();
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

  test('packDir', async () => {
    const stream = tar.pack();
    const txt = String(Math.random());
    const file = path.join(resultsDirectory, jobId, 'a.txt');
    stream.entry({ name: 'a.txt' }, txt);
    stream.finalize();
    await reporter.packDir(jobId, stream);
    const result = await fs.readFile(file, 'utf8');
    expect(result).toBe(txt);
    await fs.remove(path.join(resultsDirectory, jobId));
  });
});
