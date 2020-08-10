import { command } from './refresh-series-parameters';
import { setUpMongoFixture, usingModels } from '../../test/util-mongo';
import { Models, DicomTagReader } from '../interface';
import { CommandFunc } from './Command';
import { DicomFileRepository } from '@utrad-ical/circus-lib';

const modelsPromise = usingModels();
let commandFunc: CommandFunc,
  dicomFileRepository: DicomFileRepository,
  models: Models,
  dicomTagReader: DicomTagReader;

const seriesUid = '111.222.333.444.555';
const overMaxDateSeriesUid = '111.222.333.444.444';

beforeAll(async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const ab = new Uint8Array(10);

  dicomFileRepository = {
    getSeries: async (seriesUid: string) => ({
      load: async (image: number) => ab.buffer,
      save: () => Promise.resolve(),
      images: '1-10'
    }),
    deleteSeries: () => Promise.resolve()
  };

  dicomTagReader = ((async () => {
    return {
      parameters: { PhotometricInterpretation: 'MONOCHROME2' }
    };
  }) as any) as DicomTagReader;
});

beforeEach(async () => {
  const { db } = await modelsPromise;
  models = (await modelsPromise).models;
  await setUpMongoFixture(db, ['series']);

  commandFunc = await command(undefined, {
    models,
    dicomTagReader,
    dicomFileRepository
  });
});

test('refresh series parameters', async () => {
  await commandFunc({});
  const seriesData = await models.series.findById(seriesUid);
  expect(seriesData.parameters.PhotometricInterpretation).toBe('MONOCHROME2');
});

test('refresh series parameters with maxDate', async () => {
  await commandFunc({ maxDate: '2020-08-30T00:00:00Z' });
  const seriesData = await models.series.findById(seriesUid);
  expect(seriesData.parameters.PhotometricInterpretation).toBe('MONOCHROME2');
  const seriesData2 = await models.series.findById(overMaxDateSeriesUid);
  expect(seriesData2.parameters.PhotometricInterpretation).toBe(undefined);
});
