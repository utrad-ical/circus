import assert from 'node:assert/strict';
import { test, before } from 'node:test';
import { usingModels, setUpMongoFixture } from '../test/util-mongo.ts';
import type { Models } from '../interface.ts';
import duplicateJobExists from './duplicateJobExists.ts';

let models: Models;
const modelsPromise = usingModels();

before(async () => {
  const { database, models: m } = await modelsPromise;
  await setUpMongoFixture(database.db, ['pluginJobs']);
  models = m;
});

const makeBaseRequest = () => ({
  pluginId: 'd135e1fbb368e35f940ae8e6deb171e90273958dc3938de5a8237b73bb42d9c2',
  series: [
    {
      seriesUid: '111.222.333.444.555',
      partialVolumeDescriptor: {
        start: 1,
        end: 10,
        delta: 1
      }
    },
    {
      seriesUid: '111.222.333.444.666',
      partialVolumeDescriptor: {
        start: 10,
        end: 1,
        delta: -1
      }
    }
  ]
});

test('detects a duplicate plug-in job', async () => {
  const result = await duplicateJobExists(models, makeBaseRequest());
  assert.equal(result, true);
});

test('treats jobs with different plug-in IDs as distinct', async () => {
  const request = makeBaseRequest();
  request.pluginId = 'mnopqrstuvwx';
  const result = await duplicateJobExists(models, request);
  assert.equal(result, false);
});

test('treats jobs with different numbers of series as distinct', async () => {
  const request = makeBaseRequest();
  request.series.pop();
  const result = await duplicateJobExists(models, request);
  assert.equal(result, false);
});

test('treats jobs with different series UIDs as distinct', async () => {
  const request = makeBaseRequest();
  request.series[0].seriesUid = '0.0.0.0.0';
  const result = await duplicateJobExists(models, request);
  assert.equal(result, false);
});

test('detects duplicates regardless of partial volume descriptor field order', async () => {
  const request = makeBaseRequest();
  request.series[0].partialVolumeDescriptor = {
    end: 10,
    start: 1,
    delta: 1
  };
  const result = await duplicateJobExists(models, request);
  assert.equal(result, true);
});

test('ignores invalidated jobs when checking for duplicates', async () => {
  const request = {
    pluginId: 'zyxwvutsrqpo',
    series: [
      {
        seriesUid: '9.8.7.6.5',
        partialVolumeDescriptor: {
          start: 1,
          end: 10,
          delta: 1
        }
      }
    ]
  };
  const result = await duplicateJobExists(models, request);
  assert.equal(result, false);
});

test('ignores failed jobs when checking for duplicates', async () => {
  const request = {
    pluginId: 'opqrstuvwxyz',
    series: [
      {
        seriesUid: '5.6.7.8.9',
        partialVolumeDescriptor: {
          start: 1,
          end: 10,
          delta: 1
        }
      }
    ]
  };
  const result = await duplicateJobExists(models, request);
  assert.equal(result, false);
});
