import { withDates } from './schemas/derive.ts';
import testSchemas from '../test/test-schemas.ts';
import assert from 'node:assert/strict';
import { describe, test, before, after } from 'node:test';
import { createTransactionManagerFactory } from './createTransactionManager.ts';
import type * as mongo from 'mongodb';
import type { ClientSession } from 'mongodb';
import { setUpMongoFixture, usingMongo } from './test/util-mongo.ts';
import createValidator from './createValidator.ts';
import createCollectionAccessor from '../src/db/createCollectionAccessor.ts';
import type { Database, Validator, TransactionManager } from './interface.ts';

// Replace makeModels to use a test-only collection
const createTransactionManager = createTransactionManagerFactory(((
  database: Database,
  validator: Validator,
  session: ClientSession
) => {
  return {
    bankAccounts: createCollectionAccessor(database.db, validator, {
      name: 'bankAccounts',
      schema: withDates(testSchemas.bankAccounts.required()),
      collectionName: 'bankAccounts',
      primaryKey: 'userId',
      session
    })
  };
}) as any);

let database: Database, validator: Validator, db: mongo.Db;
const dbPromise = usingMongo();

before(async () => {
  database = (await dbPromise).database;
  db = database.db;
  validator = await createValidator(undefined);
  await setUpMongoFixture(db, ['bankAccounts']);
});

after(async () => {
  if (database.dispose) {
    await database.dispose();
  }
});

describe('createTransactionManager', () => {
  let transactionManager: TransactionManager;
  before(async () => {
    transactionManager = await createTransactionManager(
      { maxCommitTimeMS: 10000 },
      { database, validator }
    );
  });

  test('use transacton processing', async () => {
    const userId = 1;
    const useTransactionProcessing = async () => {
      await transactionManager.withTransaction(async (models: any) => {
        const doc = await models.bankAccounts.findById(userId, {
          withLock: true
        });
        await models.bankAccounts.modifyOne(userId, {
          balance: doc.balance + 1
        });
      });
    };

    const array = [];
    for (let i = 0; i < 10; i++) {
      array.push(useTransactionProcessing());
    }
    await Promise.all(array);
    const result = await db.collection('bankAccounts').findOne({ userId });
    assert.equal(result!.balance, 10010);
  });

  test('ends sessions after successful and failed transactions', async t => {
    const startSession = t.mock.method(database.connection, 'startSession');
    const result = await transactionManager.withTransaction(async () => 'ok');
    assert.equal(result, 'ok');

    const failure = new Error('Transaction failed');
    await assert.rejects(
      transactionManager.withTransaction(async () => {
        throw failure;
      }),
      error => error === failure
    );

    assert.deepEqual(
      startSession.mock.calls.map(({ result }) => result?.hasEnded),
      [true, true]
    );
  });

  // test('not use transacton processing', async () => {
  //   const userId = 2;
  //   const notUseTransactionProcessing = async () => {
  //     const user = await db.collection('bankAccounts').findOne({ userId });
  //     await db
  //       .collection('bankAccounts')
  //       .updateOne({ userId: user }, { $set: { balance: user.balance + 1 } });
  //   };
  //   const array = [];
  //   for (let i = 0; i < 10; i++) {
  //     array.push(notUseTransactionProcessing());
  //   }
  //   await Promise.all(array);
  //   const result = await db.collection('bankAccounts').findOne({ userId });
  //   expect(result.balance).not.toBe(5010);
  // });
});
