import { MongoClient } from 'mongodb';

export const connectProdDb = async () => {
  const mongoUrl = process.env.CIRCUS_MONGO_URL || process.env.MONGO_URL;
  if (!mongoUrl) throw new Error('You must specify the MongoDB connection URL');
  return connectDb(mongoUrl);
};

/**
 * Establishes a new connection to a MongoDB server.
 * @param connectionString The Mongo connection URL with database,
 * eg `'mongodb://localhost:27017/mydatabase'`
 */
const connectDb = async (connectionString: string) => {
  const dbConnection = await MongoClient.connect(connectionString, {
    useUnifiedTopology: true
  });
  const db = dbConnection.db(new URL(connectionString).pathname.slice(1));
  return { dbConnection, db };
};

export default connectDb;
