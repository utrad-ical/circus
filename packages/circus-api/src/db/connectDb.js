import { MongoClient } from 'mongodb';

export default async function connectDb() {
	const url = process.env.CIRCUS_MONGO_URL ||
		process.env.MONGO_URL;
	const db = await MongoClient.connect(url);
	return db;
}