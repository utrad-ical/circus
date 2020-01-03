import DicomImporter from './DicomImporter';
import * as path from 'path';
import { connectMongo, setUpMongoFixture } from '../test/util-mongo';
import mongo from 'mongodb';
import createModels, { Models } from './db/createModels';
import createValidator from './createValidator';
import { MemoryDicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';

if (!process.env.DICOM_UTILITY) {
  // Skip this test if dicom_utility is not available
  describe.skip('DicomImporter', () => {});
} else {
  describe('DicomImporter', function() {
    let repository: MemoryDicomFileRepository,
      importer: DicomImporter,
      models: Models,
      db: mongo.Db,
      dbConnection: mongo.MongoClient;
    const file = path.join(__dirname, '../test/dicom/CT-MONO2-16-brain.dcm');

    beforeAll(async () => {
      ({ db, dbConnection } = await connectMongo());
      const validator = await createValidator();
      models = createModels(db, validator);
    });

    afterAll(async () => {
      await dbConnection.close();
    });

    beforeEach(async () => {
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
}
