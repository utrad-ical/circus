import { withDates } from '../schemas/derive.ts';
import testSchemas from '../../test/test-schemas.ts';
import assert from 'node:assert/strict';
import { describe, test, before, after, beforeEach } from 'node:test';

import type * as mongo from 'mongodb';
import { setUpMongoFixture, usingMongo } from '../test/util-mongo.ts';
import createValidator, { ValidationError } from '../createValidator.ts';
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
  const validator = await createValidator(undefined);
  testCollection = await createCollectionAccessor<MonthData>(db, validator, {
    name: 'months',
    schema: withDates(testSchemas.months.required()),
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
  test('inserts a valid document', async () => {
    await testCollection.insert({ month: 8, name: 'Hazuki' });
    const result = await db.collection('months').find({ month: 8 }).toArray();
    assert.ok(result instanceof Array);
    assert.equal(result.length, 1);
    assert.partialDeepStrictEqual(result[0], { month: 8, name: 'Hazuki' });
    assert.ok(result[0].createdAt instanceof Date);
    assert.ok(result[0].updatedAt instanceof Date);
  });

  test('rejects an invalid document', async () => {
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
  test('inserts a new document', async () => {
    await testCollection.upsert(8, { name: 'Hazuki' });
    const result = await db.collection('months').find({ month: 8 }).toArray();
    assert.equal(result.length, 1);
    assert.ok(result[0].createdAt instanceof Date);
    assert.ok(result[0].updatedAt instanceof Date);
    assert.equal(result[0].name, 'Hazuki');
  });

  test('updates an existing document', async () => {
    await testCollection.upsert(3, { name: 'March' });
    const result = await db.collection('months').find({ month: 3 }).toArray();
    assert.equal(result.length, 1);
    assert.ok(result[0].createdAt instanceof Date);
    assert.ok(result[0].updatedAt instanceof Date);
    assert.equal(result[0].name, 'March');
  });

  test('rejects an upsert with invalid data', async () => {
    await assert.rejects(
      testCollection.upsert(3, { name: 3 } as any),
      ValidationError
    );
    await assert.rejects(testCollection.upsert(7, {}), ValidationError);
  });
});

describe('#insertMany', () => {
  test('inserts multiple valid documents', async () => {
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

  test('rejects a batch containing an invalid document', async () => {
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
  test('returns matching documents without _id', async () => {
    const result = await testCollection.findAll({ month: 4 });
    assert.equal(result.length, 2);
    assert.partialDeepStrictEqual(result[0], { month: 4, name: 'Uzuki' });
    assert.partialDeepStrictEqual(result[1], { month: 4, name: 'Uzuki' });
  });

  test('returns an empty array when no documents match', async () => {
    const result = await testCollection.findAll({ month: 13 });
    assert.deepEqual(result, []);
  });

  test('sorts the results before skipping documents', async () => {
    const result = await testCollection.findAll(
      { month: { $lte: 4 } },
      { sort: { month: -1 }, skip: 1 }
    );
    assert.equal(result[1].name, 'Yayoi');
    assert.equal(result[2].name, 'Kisaragi');
  });

  test('limits the number of returned documents', async () => {
    const result = await testCollection.findAll(
      { month: { $lte: 4 } },
      { limit: 1 }
    );
    assert.equal(result.length, 1);
  });
});

describe('#deleteMany', () => {
  test('deletes multiple documents at once', async () => {
    await testCollection.deleteMany({ month: 4 });
    const shouldBeEmpty = await testCollection.findAll({ month: 4 });
    assert.deepEqual(shouldBeEmpty, []);
  });
});

describe('#findById', () => {
  test('returns the matching document without _id', async () => {
    const result = (await testCollection.findById(3)) as any;
    assert.equal(result.name, 'Yayoi');
    assert.equal(result._id, undefined);
  });

  test('rejects stored data that fails validation', async () => {
    await assert.rejects(testCollection.findByIdOrFail(7), ValidationError);
  });

  describe('with lock document', () => {
    let session: mongo.ClientSession;
    let sessionCollection: CollectionAccessor<MonthData>;

    before(async () => {
      const validator = await createValidator(undefined);
      session = (await dbPromise).database.connection.startSession();
      sessionCollection = createCollectionAccessor<MonthData>(db, validator, {
        name: 'months',
        schema: withDates(testSchemas.months.required()),
        collectionName: 'months',
        primaryKey: 'month',
        session
      });
    });

    test('returns the same document with or without a lock', async () => {
      const LockedDoc = await sessionCollection.findById(3, { withLock: true });
      assert.equal(LockedDoc.name, 'Yayoi');

      const withoutLocked = await testCollection.findById(3);
      assert.deepEqual(LockedDoc, withoutLocked);
    });

    test('rejects a locking read without a session', async () => {
      const promise = testCollection.findById(3, { withLock: true });
      await assert.rejects(promise, {
        message: /Cannot lock a document outside a session/
      });
    });
  });
});

describe('#findByIdOrFail', () => {
  test('returns the document for the given primary key', async () => {
    const result = (await testCollection.findByIdOrFail(3)) as any;
    assert.equal(result.name, 'Yayoi');
    assert.equal(result._id, undefined);
  });

  test('rejects a missing document', async () => {
    await assert.rejects(testCollection.findByIdOrFail(13));
  });
});

describe('#modifyOne', () => {
  test('returns the updated document', async () => {
    const original = await testCollection.modifyOne(2, { name: 'Nigatsu' });
    assert.equal(original.name, 'Nigatsu');
    const modified = await testCollection.findById(2);
    assert.equal(modified.name, 'Nigatsu');
  });

  test('rejects an invalid update', async () => {
    await assert.rejects(
      testCollection.modifyOne(3, { name: 5 } as any),
      ValidationError
    );
  });

  test('rejects an update to a missing document', async () => {
    await assert.rejects(testCollection.modifyOne(13, { name: 'Pon' }));
  });
});

describe('#newSequentialId', () => {
  test('increments an existing sequence', async () => {
    const v1 = await testCollection.newSequentialId();
    assert.equal(v1, 13);
    const v2 = await testCollection.newSequentialId();
    assert.equal(v2, 14);
  });

  test('starts at one for a new sequence', async () => {
    await db.collection('sequences').deleteMany({});
    const v1 = await testCollection.newSequentialId();
    assert.equal(v1, 1);
    const v2 = await testCollection.newSequentialId();
    assert.equal(v2, 2);
  });
});

describe('unknown properties in the database', () => {
  beforeEach(async () => {
    const now = new Date();
    await db.collection('months').insertOne({
      month: 13,
      name: 'Extra',
      legacy: true,
      createdAt: now,
      updatedAt: now
    });
  });

  test('omits unknown stored fields when reading a document', async () => {
    const result = (await testCollection.findById(13)) as any;
    assert.equal(result.legacy, true);
    const cursor = testCollection.findAsCursor({ month: 13 });
    assert.equal(((await cursor.next()) as any).name, 'Extra');
  });

  test('rejects unknown stored fields when reading with a strict cursor', async () => {
    const cursor = testCollection.findAsCursor({ month: 13 }, { strict: true });
    await assert.rejects(cursor.next(), ValidationError);
  });
});
