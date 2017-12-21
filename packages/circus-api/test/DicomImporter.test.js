import DicomImporter from '../src/DicomImporter';
import { assert } from 'chai';
import createStorage from '../src/storage/createStorage';
import * as path from 'path';
import * as test from './test-utils';
import createModels from '../src/db/createModels';
import createValidator from '../src/createValidator';

describe('DicomImporter', function() {
  // Skip this test if dicom_utility is not available

  let storage, importer, models, db;
  const file = path.join(__dirname, 'dicom', 'CT-MONO2-16-brain.dcm');

  before(async function() {
    db = await test.connectMongo();
    const validator = await createValidator();
    models = createModels(db, validator);
  });

  after(async function() {
    await db.close();
  });

  beforeEach(async function() {
    if (process.env.DICOM_UTILITY) {
      storage = await createStorage('memory');
      await test.setUpMongoFixture(db, ['series']);
      importer = new DicomImporter(storage, models, {
        utility: process.env.DICOM_UTILITY
      });
    } else {
      this.skip();
    }
  });

  describe('#readDicomTagsFromFile', function() {
    it('should correctly read DICOM tags', async function() {
      const tags = await importer.readDicomTagsFromFile(file);
      assert.equal(tags.patientName, 'Anonymized');
      assert.strictEqual(tags.instanceNumber, '8');
    });
  });

  describe('#importFromFile', function() {
    it('should import a DICOM file', async function() {
      await importer.importFromFile(file, 'someDomain');
      const key =
        '2.16.840.1.113662.2.1.2519.21582.2990505.2105152.2381633.20/8';
      assert.isTrue(await storage.exists(key));
    });
  });
});
