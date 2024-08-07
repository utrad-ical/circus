import createTransactionManager from './createTransactionManager';
import mongo, { ClientSession } from 'mongodb';
import { setUpMongoFixture, usingMongo } from './test/util-mongo';
import createValidator from './createValidator';
import createCollectionAccessor from '../src/db/createCollectionAccessor';
import { Database, Validator, TransactionManager } from './interface';

const mock_createCollectionAccessor = createCollectionAccessor;

// Use Jest's manual mock to replace makeModels
jest.mock('./db/createModels', () => ({
  makeModels: (
    database: Database,
    validator: Validator,
    session: ClientSession
  ) => {
    return {
      bankAccounts: mock_createCollectionAccessor(database.db, validator, {
        schema: 'bankAccounts',
        collectionName: 'bankAccounts',
        primaryKey: 'userId',
        session
      })
    };
  }
}));

let database: Database, validator: Validator, db: mongo.Db;
const dbPromise = usingMongo();

beforeAll(async () => {
  database = await dbPromise;
  ({ db } = await dbPromise);
  validator = await createValidator({
    schemaRoot: __dirname + '/../test/test-schemas'
  });
  await setUpMongoFixture(db, ['bankAccounts']);
});

describe('createTransactionManager', () => {
  let transactionManager: TransactionManager;
  beforeAll(async () => {
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
    expect(result.balance).toBe(10010);
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
