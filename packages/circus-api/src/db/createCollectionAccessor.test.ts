import createValidator from '../createValidator';
import createCollectionAccessor, {
  CollectionAccessor
} from './createCollectionAccessor';
import { ValidationError } from 'ajv';
import { connectMongo, setUpMongoFixture } from '../../test/util-mongo';
import mongo from 'mongodb';

let db: mongo.Db,
  dbConnection: mongo.MongoClient,
  testCollection: CollectionAccessor;

beforeAll(async function() {
  const validator = await createValidator(
    __dirname + '/../../test/test-schemas'
  );
  ({ db, dbConnection } = await connectMongo());
  testCollection = await createCollectionAccessor(db, validator, {
    schema: 'months',
    collectionName: 'months',
    primaryKey: 'month'
  });
});

beforeEach(async function() {
  if (db) {
    await setUpMongoFixture(db, ['months', 'sequences']);
  }
});

afterAll(async function() {
  if (dbConnection) {
    const col = db.collection('months');
    await col.deleteMany({});
    await dbConnection.close();
  }
});

describe('#insert', function() {
  it('should insert a single document after successful validation', async function() {
    await testCollection.insert({ month: 8, name: 'Hazuki' });
    const result = await db
      .collection('months')
      .find({ month: 8 })
      .toArray();
    expect(result).toBeInstanceOf(Array);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ month: 8, name: 'Hazuki' });
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].updatedAt).toBeInstanceOf(Date);
  });

  it('should raise an error on trying to insert invalid data', async function() {
    await expect(
      testCollection.insert({ month: 'hello', name: 10 })
    ).rejects.toThrow(ValidationError);
    await expect(testCollection.insert({ month: 5 })).rejects.toThrow(
      ValidationError
    );
    await expect(testCollection.insert({})).rejects.toThrow(ValidationError);
  });
});

describe('#upsert', function() {
  it('should insert a new document', async function() {
    await testCollection.upsert(8, { name: 'Hazuki' });
    const result = await db
      .collection('months')
      .find({ month: 8 })
      .toArray();
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].updatedAt).toBeInstanceOf(Date);
    expect(result[0].name).toBe('Hazuki');
  });

  it('should update an existing document', async function() {
    await testCollection.upsert(3, { name: 'March' });
    const result = await db
      .collection('months')
      .find({ month: 3 })
      .toArray();
    expect(result).toHaveLength(1);
    expect(result[0].createdAt).toBeInstanceOf(Date);
    expect(result[0].updatedAt).toBeInstanceOf(Date);
    expect(result[0].name).toBe('March');
  });

  it('should raise an error on trying to upsert invalid data', async function() {
    await expect(testCollection.upsert(3, { name: 3 })).rejects.toThrow(
      ValidationError
    );
    await expect(testCollection.upsert(7, {})).rejects.toThrow(ValidationError);
  });
});

describe('#insertMany', function() {
  it('should insert multiple documents after successful validation', async function() {
    await testCollection.insertMany([
      { month: 6, name: 'Minazuki' },
      { month: 8, name: 'Hazuki' }
    ]);
    const result = await db
      .collection('months')
      .find({ $or: [{ month: 6 }, { month: 8 }] })
      .project({ _id: false })
      .sort({ month: 1 })
      .toArray();
    expect(result[0]).toMatchObject({ month: 6, name: 'Minazuki' });
    expect(result[1]).toMatchObject({ month: 8, name: 'Hazuki' });
  });

  it('should throw when validation fails', async function() {
    await expect(
      testCollection.insertMany([
        { month: 6, name: 'Minazuki' },
        { month: 8, name: 17 }
      ])
    ).rejects.toThrow(ValidationError);
  });
});

describe('#findAll', function() {
  it('should find an array of matched documents without _id', async function() {
    const result = await testCollection.findAll({ month: 4 });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ month: 4, name: 'Uzuki' });
    expect(result[1]).toMatchObject({ month: 4, name: 'Uzuki' });
  });

  it('should return an empty array if nothing matched', async function() {
    const result = await testCollection.findAll({ month: 13 });
    expect(result).toEqual([]);
  });

  it('should perform sorting and skipping', async function() {
    const result = await testCollection.findAll(
      { month: { $lte: 4 } },
      { sort: { month: -1 }, skip: 1 }
    );
    expect(result[1].name).toBe('Yayoi');
    expect(result[2].name).toBe('Kisaragi');
  });

  it('should perform row number limiting', async function() {
    const result = await testCollection.findAll(
      { month: { $lte: 4 } },
      { limit: 1 }
    );
    expect(result).toHaveLength(1);
  });
});

describe('#deleteMany', function() {
  it('should delete multiple documents at once', async function() {
    await testCollection.deleteMany({ month: 4 });
    const shouldBeEmpty = await testCollection.findAll({ month: 4 });
    expect(shouldBeEmpty).toEqual([]);
  });
});

describe('#findById', function() {
  it('should return valid data without _id for the given primary key', async function() {
    const result = await testCollection.findById(3);
    expect(result.name).toBe('Yayoi');
    expect(result._id).toBeUndefined();
  });

  it('should raise an error when trying to load corrupted data', async function() {
    await expect(testCollection.findByIdOrFail(7)).rejects.toThrow(
      ValidationError
    );
  });
});

describe('#findByIdOrFail', function() {
  it('should return valid data when primary key is given', async function() {
    const result = await testCollection.findByIdOrFail(3);
    expect(result.name).toBe('Yayoi');
    expect(result._id).toBeUndefined();
  });

  it('should throw when trying to load nonexistent data', async function() {
    await expect(testCollection.findByIdOrFail(13)).rejects.toThrow();
  });
});

describe('#modifyOne', function() {
  it('should perform mutation and returns the modified data', async function() {
    const original = await testCollection.modifyOne(2, { name: 'Nigatsu' });
    expect(original.name).toBe('Nigatsu');
    const modified = await testCollection.findById(2);
    expect(modified.name).toBe('Nigatsu');
  });

  it('should throw an error with invalid data', async function() {
    await expect(testCollection.modifyOne(3, { name: 5 })).rejects.toThrow(
      ValidationError
    );
  });

  it('should throw if not found', async function() {
    await expect(
      testCollection.modifyOne(13, {
        $set: { name: 'Pon' }
      })
    ).rejects.toThrow();
  });
});

describe('#newSequentialId', function() {
  it('should generate new ID', async function() {
    const v1 = await testCollection.newSequentialId();
    expect(v1).toBe(13);
    const v2 = await testCollection.newSequentialId();
    expect(v2).toBe(14);
  });

  it('should generate new sequence', async function() {
    await db.collection('sequences').deleteMany({});
    const v1 = await testCollection.newSequentialId();
    expect(v1).toBe(1);
    const v2 = await testCollection.newSequentialId();
    expect(v2).toBe(2);
  });
});
