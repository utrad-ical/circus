import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import path from 'path';
import createTestLogger from '../../test/util-logger';
import { setUpMongoFixture, usingModels } from '../../test/util-mongo';
import createDicomImporter from '../createDicomImporter';
import { Models } from '../interface';
import { CommandFunc } from './Command';
import { command } from './import-series';
import createDicomTagReader from '../utils/createDicomTagReader';

const modelsPromise = usingModels(),
  domain = 'default';
let commandFunc: CommandFunc,
  dicomFileRepository: MemoryDicomFileRepository,
  models: Models;

beforeEach(async () => {
  const { db } = await modelsPromise;
  models = (await modelsPromise).models;
  await setUpMongoFixture(db, ['series']);
  const apiLogger = await createTestLogger();
  dicomFileRepository = new MemoryDicomFileRepository({});
  const dicomTagReader = await createDicomTagReader({});
  const dicomImporter = await createDicomImporter(
    {},
    { dicomFileRepository, models, apiLogger, dicomTagReader }
  );
  commandFunc = await command(null, { dicomImporter });
});

const seriesUid = '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20';

test('import from a DICOM file', async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const file = path.join(__dirname, '../../test/dicom/CT-MONO2-16-brain.dcm');
  await commandFunc({ domain, _args: [file] });
  expect(spy).toHaveBeenCalledWith('Imported 1 file.');
  const seriesAccessor = await dicomFileRepository.getSeries(seriesUid);
  expect(seriesAccessor.images).toBe('8');
  expect((await seriesAccessor.load(8)) instanceof ArrayBuffer).toBe(true);
  const seriesData = await models.series.findById(seriesUid);
  expect(seriesData.domain).toBe('default');
});

test('import from a zip file', async () => {
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const file = path.join(__dirname, '../../test/dicom/test.zip');
  await commandFunc({ domain, _args: [file] });
  expect(spy).toHaveBeenCalledWith('Imported 1 file.');
  const seriesAccessor = await dicomFileRepository.getSeries(seriesUid);
  expect(seriesAccessor.images).toBe('8');
  expect((await seriesAccessor.load(8)) instanceof ArrayBuffer).toBe(true);
  const seriesData = await models.series.findById(seriesUid);
  expect(seriesData.domain).toBe('default');
});

test('throws when domain is unspecified', async () => {
  await expect(commandFunc({ _args: ['dummy'] })).rejects.toThrow(
    /Domain must be specified/
  );
});

// TODO: check error on broken DICOM file
// TODO: check error on broken ZIP file
