import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import * as path from 'path';
import { setUpMongoFixture, usingMongo } from '../test/util-mongo';
import createValidator from './createValidator';
import createModels, { Models } from './db/createModels';
import DicomImporter from './DicomImporter';

describe('DicomImporter', () => {
  if (!process.env.DICOM_UTILITY) {
    // Skip this test if dicom_utility is not available
    test.skip('Skipping DicomImporter tests', () => {});
    return;
  }

  const dbPromise = usingMongo();

  let repository: MemoryDicomFileRepository,
    importer: DicomImporter,
    models: Models;
  const file = path.join(__dirname, '../test/dicom/CT-MONO2-16-brain.dcm');

  beforeAll(async () => {
    const db = await dbPromise;
    const validator = await createValidator(undefined);
    models = createModels(db, validator);
  });

  beforeEach(async () => {
    const db = await dbPromise;
    repository = new MemoryDicomFileRepository({});
    await setUpMongoFixture(db, ['series']);
    importer = new DicomImporter(repository, models, {
      utility: process.env.DICOM_UTILITY!
    });
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
      const seriesLoader = await repository.getSeries(
        '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20'
      );
      expect(await seriesLoader.load(8)).not.toBeUndefined();
    });
  });
});
