import assert from 'node:assert/strict';
import { describe, test, it, before, after, beforeEach } from 'node:test';
import { ValidationError } from 'ajv';
import type * as mongo from 'mongodb';
import { setUpMongoFixture, usingMongo } from '../test/util-mongo.ts';
import createValidator from '../createValidator.ts';
import type { CollectionAccessor } from './createCollectionAccessor.ts';
import createCollectionAccessor from './createCollectionAccessor.ts';

interface MonthData {
  month: number;
  name: string;
}

let testCollection: CollectionAccessor<MonthData>, db: mongo.Db;
let disposeMongo: () => Promise<void>;
const dbPromise = usingMongo();

before(async () => {
  db = (await dbPromise).database.db;
  disposeMongo = (await dbPromise).dispose;
  const validator = await createValidator({
    schemaRoot: __dirname + '/../../test/test-schemas'
  });
  testCollection = await createCollectionAccessor<MonthData>(db, validator, {
    schema: 'months',
    collectionName: 'months',
    primaryKey: 'month'
  });
});

beforeEach(async () => {
  await setUpMongoFixture(db, ['months', 'sequences']);
});

after(async () => {
  const col = db.collection('months');
  await col.deleteMany({});
  if (disposeMongo) {
    await disposeMongo();
  }
});

describe('#insert', () => {
  it('should insert a single document after successful validation', async () => {
    await testCollection.insert({ month: 8, name: 'Hazuki' });
    const result = await db.collection('months').find({ month: 8 }).toArray();
    assert.ok(result instanceof Array);
    assert.equal(result.length, 1);
    assert.partialDeepStrictEqual(result[0], { month: 8, name: 'Hazuki' });
    assert.ok(result[0].createdAt instanceof Date);
    assert.ok(result[0].updatedAt instanceof Date);
  });

  it('should raise an error on trying to insert invalid data', async () => {
    await assert.rejects(
      testCollection.insert({ month: 'hello', name: 10 } as any),
      ValidationError
    );
    await assert.rejects(
      testCollection.insert({ month: 5 } as any),
      ValidationError
    );
    await assert.rejects(testCollection.insert({} as any), ValidationError);
  });
});

describe('#upsert', () => {
  it('should insert a new document', async () => {
    await testCollection.upsert(8, { name: 'Hazuki' });
    const result = await db.collection('months').find({ month: 8 }).toArray();
    assert.equal(result.length, 1);
    assert.ok(result[0].createdAt instanceof Date);
    assert.ok(result[0].updatedAt instanceof Date);
    assert.equal(result[0].name, 'Hazuki');
  });

  it('should update an existing document', async () => {
    await testCollection.upsert(3, { name: 'March' });
    const result = await db.collection('months').find({ month: 3 }).toArray();
    assert.equal(result.length, 1);
    assert.ok(result[0].createdAt instanceof Date);
    assert.ok(result[0].updatedAt instanceof Date);
    assert.equal(result[0].name, 'March');
  });

  it('should raise an error on trying to upsert invalid data', async () => {
    await assert.rejects(
      testCollection.upsert(3, { name: 3 } as any),
      ValidationError
    );
    await assert.rejects(testCollection.upsert(7, {}), ValidationError);
  });
});

describe('#insertMany', () => {
  it('should insert multiple documents after successful validation', async () => {
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
    assert.partialDeepStrictEqual(result[0], { month: 6, name: 'Minazuki' });
    assert.partialDeepStrictEqual(result[1], { month: 8, name: 'Hazuki' });
  });

  it('should throw when validation fails', async () => {
    await assert.rejects(
      testCollection.insertMany([
        { month: 6, name: 'Minazuki' },
        { month: 8, name: 17 } as any
      ]),
      ValidationError
    );
  });
});

describe('#findAll', () => {
  it('should find an array of matched documents without _id', async () => {
    const result = await testCollection.findAll({ month: 4 });
    assert.equal(result.length, 2);
    assert.partialDeepStrictEqual(result[0], { month: 4, name: 'Uzuki' });
    assert.partialDeepStrictEqual(result[1], { month: 4, name: 'Uzuki' });
  });

  it('should return an empty array if nothing matched', async () => {
    const result = await testCollection.findAll({ month: 13 });
    assert.deepEqual(result, []);
  });

  it('should perform sorting and skipping', async () => {
    const result = await testCollection.findAll(
      { month: { $lte: 4 } },
      { sort: { month: -1 }, skip: 1 }
    );
    assert.equal(result[1].name, 'Yayoi');
    assert.equal(result[2].name, 'Kisaragi');
  });

  it('should perform row number limiting', async () => {
    const result = await testCollection.findAll(
      { month: { $lte: 4 } },
      { limit: 1 }
    );
    assert.equal(result.length, 1);
  });
});

describe('#deleteMany', () => {
  it('should delete multiple documents at once', async () => {
    await testCollection.deleteMany({ month: 4 });
    const shouldBeEmpty = await testCollection.findAll({ month: 4 });
    assert.deepEqual(shouldBeEmpty, []);
  });
});

describe('#findById', () => {
  it('should return valid data without _id for the given primary key', async () => {
    const result = (await testCollection.findById(3)) as any;
    assert.equal(result.name, 'Yayoi');
    assert.equal(result._id, undefined);
  });

  it('should raise an error when trying to load corrupted data', async () => {
    await assert.rejects(testCollection.findByIdOrFail(7), ValidationError);
  });

  describe('with lock document', () => {
    let session: mongo.ClientSession;
    let sessionCollection: CollectionAccessor<MonthData>;

    before(async () => {
      const validator = await createValidator({
        schemaRoot: __dirname + '/../../test/test-schemas'
      });
      session = (await dbPromise).database.connection.startSession();
      sessionCollection = createCollectionAccessor<MonthData>(db, validator, {
        schema: 'months',
        collectionName: 'months',
        primaryKey: 'month',
        session
      });
    });

    test('should return same data  with or without the lock', async () => {
      const LockedDoc = await sessionCollection.findById(3, { withLock: true });
      assert.equal(LockedDoc.name, 'Yayoi');

      const withoutLocked = await testCollection.findById(3);
      assert.deepEqual(LockedDoc, withoutLocked);
    });

    test('throw error for session is not used', async () => {
      const promise = testCollection.findById(3, { withLock: true });
      await assert.rejects(promise, {
        message: /Cannot lock a document outside a session/
      });
    });
  });
});

describe('#findByIdOrFail', () => {
  it('should return valid data when primary key is given', async () => {
    const result = (await testCollection.findByIdOrFail(3)) as any;
    assert.equal(result.name, 'Yayoi');
    assert.equal(result._id, undefined);
  });

  it('should throw when trying to load nonexistent data', async () => {
    await assert.rejects(testCollection.findByIdOrFail(13));
  });
});

describe('#modifyOne', () => {
  it('should perform mutation and returns the modified data', async () => {
    const original = await testCollection.modifyOne(2, { name: 'Nigatsu' });
    assert.equal(original.name, 'Nigatsu');
    const modified = await testCollection.findById(2);
    assert.equal(modified.name, 'Nigatsu');
  });

  it('should throw an error with invalid data', async () => {
    await assert.rejects(
      testCollection.modifyOne(3, { name: 5 }),
      ValidationError
    );
  });

  it('should throw if not found', async () => {
    await assert.rejects(
      testCollection.modifyOne(13, {
        $set: { name: 'Pon' }
      })
    );
  });
});

describe('#newSequentialId', () => {
  it('should generate new ID', async () => {
    const v1 = await testCollection.newSequentialId();
    assert.equal(v1, 13);
    const v2 = await testCollection.newSequentialId();
    assert.equal(v2, 14);
  });

  it('should generate new sequence', async () => {
    await db.collection('sequences').deleteMany({});
    const v1 = await testCollection.newSequentialId();
    assert.equal(v1, 1);
    const v2 = await testCollection.newSequentialId();
    assert.equal(v2, 2);
  });
});
