import { usingModels, setUpMongoFixture } from '../../test/util-mongo';
import { Models } from '../db/createModels';
import duplicateJobExists from './duplicateJobExists';

let models: Models;
const modelsPromise = usingModels();

beforeAll(async () => {
  const { db, models: m } = await modelsPromise;
  await setUpMongoFixture(db, ['pluginJobs']);
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
