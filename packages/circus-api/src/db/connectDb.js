import { MongoClient } from 'mongodb';

export default async function connectDb() {
	const db = await MongoClient.connect(process.env.MONGO_URL);
	return db;
}