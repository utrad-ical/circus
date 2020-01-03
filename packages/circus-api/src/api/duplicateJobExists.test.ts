import * as test from '../../test/util-mongo';
import mongo from 'mongodb';
import createValidator from '../createValidator';
import createModels, { Models } from '../db/createModels';
import duplicateJobExists from './duplicateJobExists';

let db: mongo.Db, dbConnection: mongo.MongoClient, models: Models;

beforeAll(async () => {
  ({ db, dbConnection } = await test.connectMongo());
  await test.setUpMongoFixture(db, ['pluginJobs']);
  const validator = await createValidator();
  models = createModels(db, validator);
});

afterAll(async () => {
  await dbConnection.close();
});

const makeBaseRequest = () => ({
  pluginId: 'abcdefghijkl',
  series: [
    {
      seriesUid: '1.2.3.4.5',
      partialVolumeDescriptor: {
        start: 1,
        end: 10,
        delta: 1
      }
    },
    {
      seriesUid: '2.3.4.5.6',
      partialVolumeDescriptor: {
        start: 10,
        end: 1,
        delta: -1
      }
    }
  ]
});

it('should return true for duplicate plugin job', async () => {
  const result = await duplicateJobExists(models, makeBaseRequest());
  expect(result).toBe(true);
});

it('should return false on different plugin ID', async () => {
  const request = makeBaseRequest();
  request.pluginId = 'mnopqrstuvwx';
  const result = await duplicateJobExists(models, request);
  expect(result).toBe(false);
});

it('should return false on different series length', async () => {
  const request = makeBaseRequest();
  request.series.pop();
  const result = await duplicateJobExists(models, request);
  expect(result).toBe(false);
});

it('should return false on different series UID', async () => {
  const request = makeBaseRequest();
  request.series[0].seriesUid = '0.0.0.0.0';
  const result = await duplicateJobExists(models, request);
  expect(result).toBe(false);
});

it('should return true when different only in the order of the elements in partial volume descriptor', async () => {
  const request = makeBaseRequest();
  request.series[0].partialVolumeDescriptor = {
    end: 10,
    start: 1,
    delta: 1
  };
  const result = await duplicateJobExists(models, request);
  expect(result).toBe(true);
});

it('should return false when status is "invalidated"', async () => {
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
  expect(result).toBe(false);
});

it('should return false when status is "failed"', async () => {
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
  expect(result).toBe(false);
});
