import { EJSON } from 'bson';
import * as fs from 'fs-extra';
import { safeLoad as yaml } from 'js-yaml';
import mongo from 'mongodb';
import * as path from 'path';
import createValidator, { Validator } from '../src/createValidator';
import connectDb, { DisposableDb } from '../src/db/connectDb';
import createModels, { Models } from '../src/db/createModels';

/**
 * Connects to a test MongoDB instance.
 * Consider using `usingMongo()` instead, which takes care of closing the
 * connection by implicitly calling `afterAll()`.
 */
export const connectMongo = async () => {
  const url = process.env.CIRCUS_MONGO_TEST_URL;
  if (!url) throw new Error('CIRCUS_MONGO_TEST_URL must be set');
  return await connectDb({ mongoUrl: url }, null);
};

export const setUpMongoFixture = async (
  db: mongo.Db,
  collections: string[]
) => {
  if (!Array.isArray(collections)) {
    throw new TypeError('collections must be an array of string');
  }
  for (const colName of collections) {
    const col = db.collection(colName);
    await col.deleteMany({});
    const content = yaml(
      await fs.readFile(
        path.join(__dirname, 'fixture', colName + '.yaml'),
        'utf8'
      )
    );
    if (content) {
      const data: any = EJSON.parse(JSON.stringify(content));
      for (const row of data) {
        if (!row.createdAt) row.createdAt = new Date();
        if (!row.updatedAt) row.updatedAt = new Date();
      }
      try {
        await col.insertMany(data);
      } catch (err) {
        console.log(err.errors);
        throw err;
      }
      if (['groups'].indexOf(colName) >= 0) {
        await db
          .collection('sequences')
          .updateOne(
            { key: colName },
            { $set: { updatedAt: new Date(), value: data.length + 1 } },
            { upsert: true }
          );
      }
    }
  }
};

export const deleteAllCollections = async (db: mongo.Db) => {
  const collections = await db.listCollections().toArray();
  for (const { name } of collections) {
    await db.dropCollection(name);
  }
};

/**
 * Initializes a test Mongo database.
 * The return value must be `await`-ed inside `test`, `beforeEach`, etc.
 * This internally calls `afterAll()` and thus automatically closes
 * the connection after the tests have finished.
 */
export const usingMongo = () => {
  return new Promise<DisposableDb>(resolve => {
    let db: DisposableDb;
    beforeAll(async () => {
      db = await connectMongo();
      resolve(db);
    });
    afterAll(async () => {
      await db.dispose();
    });
  });
};

/**
 * Initializes a test Mongo database, a validator and a models instance.
 */
export const usingModels = () => {
  return new Promise<{
    db: DisposableDb;
    validator: Validator;
    models: Models;
  }>(resolve => {
    let db: DisposableDb;
    beforeAll(async () => {
      db = await connectMongo();
      const validator = await createValidator(undefined);
      const models = await createModels(undefined, { db, validator });
      resolve({ db, validator, models });
    });
    afterAll(async () => {
      await db.dispose();
    });
  });
};
