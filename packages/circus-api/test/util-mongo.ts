import * as path from 'path';
import connectDb from '../src/db/connectDb';
import { safeLoad as yaml } from 'js-yaml';
import * as fs from 'fs-extra';
import { EJSON } from 'bson';
import mongo from 'mongodb';

export const connectMongo = async () => {
  const url = process.env.CIRCUS_MONGO_TEST_URL;
  if (!url) throw new Error('CIRCUS_MONGO_TEST_URL must be set');
  return await connectDb(url);
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
    }
  }
};
