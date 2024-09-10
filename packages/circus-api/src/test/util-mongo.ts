import { EJSON } from 'bson';
import * as fs from 'fs-extra';
import { safeLoad as yaml } from 'js-yaml';
import mongo from 'mongodb';
import * as path from 'path';
import createValidator from '../createValidator';
import { Database, Validator, Models } from '../interface';
import connectDb from '../db/connectDb';
import createModels, { makeModels } from '../db/createModels';

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
        path.join(__dirname, '../../test/fixture', colName + '.yaml'),
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
      } catch (err: any) {
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
 * You must manually call `dispose()` inside `afterAll()` to properly close
 * the Mongo connection after the tests have finished.
 */
export const usingMongo = () => {
  return new Promise<{ database: Database, dispose: () => Promise<void> }>(resolve => {
    let database: Database;
    beforeAll(async () => {
      database = await connectMongo();
      resolve({
        database: database,
        dispose: async () => {
          await database.dispose();
        }
      });
    });
  });
};

/**
 * Initializes a test Mongo database, a validator and a models instance.
 */
export const usingModels = () => {
  return new Promise<{
    database: Database;
    validator: Validator;
    models: Models;
  }>(resolve => {
    let database: Database;
    beforeAll(async () => {
      database = await connectMongo();
      const validator = await createValidator(undefined);
      const models = await createModels(undefined, {
        database: database,
        validator
      });
      resolve({ database, validator, models });
    });
    afterAll(async () => {
      await database.dispose();
    });
  });
};

export const usingSessionModels = () => {
  return new Promise<{
    database: Database;
    validator: Validator;
    models: Models;
  }>(resolve => {
    let database: Database;
    beforeAll(async () => {
      database = await connectMongo();
      const session = database.connection.startSession();
      const validator = await createValidator(undefined);
      const models = makeModels(database, validator, session);
      resolve({ database, validator, models });
    });
    afterAll(async () => {
      await database.dispose();
    });
  });
};
