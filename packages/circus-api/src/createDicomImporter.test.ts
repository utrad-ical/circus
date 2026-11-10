import assert from 'node:assert/strict';
import { test, before, beforeEach } from 'node:test';
import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib';
import * as path from 'path';
import { setUpMongoFixture, usingModels } from './test/util-mongo.ts';
import createDicomImporter from './createDicomImporter.ts';
import type { DicomImporter, Models } from './interface.ts';
import createTestLogger from './test/util-logger.ts';
import createDicomTagReader from './utils/createDicomTagReader.ts';
import fs from 'fs-extra';
import createTransactionManager from './createTransactionManager.ts';

const modelsPromise = usingModels();

let dicomFileRepository: MemoryDicomFileRepository,
  importer: DicomImporter,
  models: Models;
const file = path.join(
  import.meta.dirname,
  '../test/dicom/CT-MONO2-16-brain.dcm'
);

before(async () => {
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
  await importer.importDicom(fileContent.buffer as ArrayBuffer, 'someDomain');

  const seriesLoader = await dicomFileRepository.getSeries(seriesUid);
  assert.equal((await seriesLoader.load(8)) instanceof ArrayBuffer, true);
  const series = await models.series.findByIdOrFail(seriesUid);
  assert.equal(series.seriesUid, seriesUid);
  assert.equal(series.domain, 'someDomain');
  assert.equal(series.images, '8');
});

test('adds the image number to an existing series', async () => {
  const fileContent = await fs.readFile(file);
  const seriesUid =
    '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20';
  await importer.importDicom(fileContent.buffer as ArrayBuffer, 'someDomain');
  await models.series.modifyOne(seriesUid, { images: '1-3,10' });
  await importer.importDicom(fileContent.buffer as ArrayBuffer, 'someDomain');
  const series = await models.series.findByIdOrFail(seriesUid);
  assert.equal(series.images, '1-3,8,10');
});

test('rejects a broken file', async () => {
  const fileContent = new ArrayBuffer(512);
  await assert.rejects(importer.importDicom(fileContent, 'domain'), {
    message: /not a valid DICOM P10 file/
  });
});
