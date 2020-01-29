import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import * as path from 'path';
import { setUpMongoFixture, usingModels } from '../test/util-mongo';
import { Models } from './db/createModels';
import createDicomImporter, { DicomImporter } from './createDicomImporter';
import createTestLogger from '../test/util-logger';

const modelsPromise = usingModels();

let dicomFileRepository: MemoryDicomFileRepository,
  importer: DicomImporter,
  models: Models;
const file = path.join(__dirname, '../test/dicom/CT-MONO2-16-brain.dcm');

beforeAll(async () => {
  models = (await modelsPromise).models;
});

beforeEach(async () => {
  const { db } = await modelsPromise;
  await setUpMongoFixture(db, ['series']);
  dicomFileRepository = new MemoryDicomFileRepository({});
  const apiLogger = await createTestLogger();
  importer = await createDicomImporter(
    {},
    { dicomFileRepository, models, apiLogger }
  );
});

describe('#readDicomTagsFromFile', () => {
  it('should correctly read DICOM tags', async () => {
    const tags = await importer.readDicomTagsFromFile(file);
    expect(tags.patientName).toBe('Anonymized');
    expect(tags.instanceNumber).toBe('8');
  });
});

describe('#importFromFile', () => {
  it('should import a DICOM file', async () => {
    await importer.importFromFile(file, 'someDomain');
    const seriesLoader = await dicomFileRepository.getSeries(
      '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20'
    );
    expect((await seriesLoader.load(8)) instanceof ArrayBuffer).toBe(true);
  });
});
