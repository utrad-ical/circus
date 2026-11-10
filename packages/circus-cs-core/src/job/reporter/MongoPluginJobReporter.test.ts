import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';
import type * as mongo from 'mongodb';
import createMongoPluginJobReporter from './MongoPluginJobReporter.ts';
import { testClientPool } from '../../testHelper.ts';
import type { MongoClientPool } from '../../mongoClientPool.ts';
import tar from 'tar-stream';
import fs from 'fs-extra';
import path from 'path';
import type * as circus from '../../interface.ts';
import { PassThrough } from 'stream';

describe('pluginJobReporter', () => {
  let mongoClientPool: MongoClientPool;
  let collection: mongo.Collection;
  let reporter: circus.PluginJobReporter;

  const jobId = 'aabbcc';
  const collectionName = 'pluginJobs';
  const resultsDirectory = path.resolve(import.meta.dirname, '../../../test');

  before(async () => {
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

  after(async () => {
    await mongoClientPool.dispose();
    await fs.remove(path.join(resultsDirectory, jobId));
  });

  test('report processing', async () => {
    await reporter.report(jobId, 'processing');
    const check = await collection.findOne({ jobId });
    assert.partialDeepStrictEqual(check, { status: 'processing' });
    assert.ok(check.startedAt);
  });

  test('report finished', async () => {
    await reporter.report(jobId, 'finished');
    const check = await collection.findOne({ jobId });
    assert.partialDeepStrictEqual(check, { status: 'finished' });
    assert.ok(check.finishedAt);
  });

  test('report error', async () => {
    await reporter.report(jobId, 'failed');
    const check = await collection.findOne({ jobId });
    assert.partialDeepStrictEqual(check, { status: 'failed' });
    assert.ok(!check.finishedAt);
  });

  test('store results', async () => {
    await reporter.report(jobId, 'results', ['a', 'b', 'c']);
    const check = await collection.findOne({ jobId });
    assert.deepEqual(check.results, ['a', 'b', 'c']);
  });

  test('logStream', (_t, done) => {
    const stream = new PassThrough();
    stream.end('hello');
    reporter.logStream(jobId, stream, async () => {
      const file = path.join(resultsDirectory, jobId, 'plugin-log.txt');
      const result = await fs.readFile(file, 'utf8');
      assert.equal(result, 'hello');
      done();
    });
  });

  test('packDir', async () => {
    const stream = tar.pack();
    const txt = String(Math.random());
    const file = path.join(resultsDirectory, jobId, 'a.txt');
    stream.entry({ name: 'a.txt' }, txt);
    stream.finalize();
    await reporter.packDir(jobId, stream);
    const result = await fs.readFile(file, 'utf8');
    assert.equal(result, txt);
  });
});
