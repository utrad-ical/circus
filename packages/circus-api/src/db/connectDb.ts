import mongo from 'mongodb';
import { FunctionService } from '@utrad-ical/circus-lib';
import { Database } from '../interface';

/**
 * @deprecated
 */
export const connectProdDb = async () => {
  const mongoUrl = process.env.CIRCUS_MONGO_URL || process.env.MONGO_URL;
  if (!mongoUrl) throw new Error('You must specify the MongoDB connection URL');
  return connectDb({ mongoUrl }, {});
};

/**
 * Establishes a new connection to a MongoDB server.
 * @param connectionString The Mongo connection URL with database,
 * eg `'mongodb://localhost:27017/mydatabase'`
 */
const connectDb: FunctionService<Database> = async (opts, deps) => {
  const { mongoUrl } = opts;
  if (!mongoUrl) throw new Error('Connection string not set');
  const connection = await mongo.MongoClient.connect(mongoUrl, {
    useUnifiedTopology: true
  });
  const db = connection.db(new URL(mongoUrl).pathname.slice(1));
  const dispose = () => connection.close();
  return { db, connection, dispose };
};

connectDb.dependencies = [];

export default connectDb;
