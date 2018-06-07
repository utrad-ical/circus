import * as ajv from "ajv";
import { MongoClient } from "mongodb";
import config from "../config";
const argumentsSchema = {
  type: "object"
};

const { mongoURL, collectionTitle } = config.queue;

export default async function up_queue_mongodb(argv: any) {
  const argCheck = new ajv().compile(argumentsSchema)(argv);

  if (!argCheck) {
    console.error("Argument is something wrong.");
    process.exit(1);
  }

  try {
    await setup();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }

  console.log("Collection created: " + collectionTitle);
}

async function setup(): Promise<void> {
  const client: MongoClient = await MongoClient.connect(mongoURL);

  const db = client.db();
  try {
    await db.createCollection(collectionTitle);
    await db
      .collection(collectionTitle)
      .createIndex({ jobId: 1 }, { unique: true });
    await client.close();
  } catch (e) {
    console.error(e);
  }
}
