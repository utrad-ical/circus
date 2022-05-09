import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib';
import * as path from 'path';
import { setUpMongoFixture, usingModels } from '../test/util-mongo';
import createDicomImporter from './createDicomImporter';
import { DicomImporter, Models } from './interface';
import createTestLogger from '../test/util-logger';
import createDicomTagReader from './utils/createDicomTagReader';
import fs from 'fs-extra';
import createTransactionManager from './createTransactionManager';

const modelsPromise = usingModels();

let dicomFileRepository: MemoryDicomFileRepository,
  importer: DicomImporter,
  models: Models;
const file = path.join(__dirname, '../test/dicom/CT-MONO2-16-brain.dcm');

beforeAll(async () => {
  models = (await modelsPromise).models;
});

beforeEach(async () => {
  const { database, validator } = await modelsPromise;
  await setUpMongoFixture(database.db, ['series']);
  const dicomTagReader = await createDicomTagReader({});
  dicomFileRepository = new MemoryDicomFileRepository({});
  const apiLogger = await createTestLogger();
  const dicomUtilityRunner = {
    compress: async (buf: ArrayBuffer) => buf,
    dispose: async () => {}
  }; // mock
  const transactionManager = await createTransactionManager(
    {},
    { database, validator }
  );
  importer = await createDicomImporter(
    {},
    {
      dicomFileRepository,
      apiLogger,
      dicomTagReader,
      dicomUtilityRunner,
      transactionManager
    }
  );
});

test('import a DICOM file', async () => {
  const fileContent = await fs.readFile(file);
  const seriesUid =
    '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20';
  await importer.importDicom(fileContent.buffer, 'someDomain');

  const seriesLoader = await dicomFileRepository.getSeries(seriesUid);
  expect((await seriesLoader.load(8)) instanceof ArrayBuffer).toBe(true);
  const series = await models.series.findByIdOrFail(seriesUid);
  expect(series.seriesUid).toBe(seriesUid);
  expect(series.domain).toBe('someDomain');
  expect(series.images).toBe('8');
});

test('rejects a broken file', async () => {
  const fileContent = new ArrayBuffer(512);
  await expect(importer.importDicom(fileContent, 'domain')).rejects.toThrow(
    /not a valid DICOM P10 file/
  );
});
