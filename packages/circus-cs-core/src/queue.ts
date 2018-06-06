import { PluginJobRequest } from "./interface";
import { MongoClient } from "mongodb";
import config from "./config";

const { mongoURL } = config;
const collectionTitle = "pluginJobQueue";

export type Item<Payload> = {
  _id?: string;
  jobId: string;
  priority: number;
  payload: Payload;
  state: "wait" | "processing" | "done" | "error";
  queuedAt?: string;
  beginAt?: string;
  finishedAt?: string;
};

export /* but no meaning... */ async function createItem(
  jobId: string,
  payload: PluginJobRequest,
  priority: number = 0
): Promise<Item<PluginJobRequest>> {
  const queueItem: Item<PluginJobRequest> = {
    jobId,
    payload,
    priority,
    state: "wait"
  };
  return queueItem;
}

export async function enqueue(
  queueItem: Item<PluginJobRequest>
): Promise<string> {
  queueItem.queuedAt = new Date().toISOString();

  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  try {
    const { insertedId } = await connection
      .db()
      .collection(collectionTitle)
      .insertOne(queueItem);
    return insertedId.toString();
  } catch (e) {
    throw e;
  } finally {
    await connection.close();
  }
}

export async function dequeue(): Promise<Item<PluginJobRequest> | null> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  let queueItem: Item<PluginJobRequest> | null = null;
  if (connection) {
    try {
      queueItem = await connection
        .db()
        .collection(collectionTitle)
        .findOne<Item<PluginJobRequest>>(
          { state: "wait" },
          { sort: { priority: -1, _id: 1 }, limit: 1 }
        );
    } catch (e) {
      console.error(e);
    } finally {
      await connection.close();
    }
  }
  return queueItem;
}

export async function processing(
  queueItem: Item<PluginJobRequest>
): Promise<void> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  try {
    const { value, lastErrorObject, ok } = await connection
      .db()
      .collection(collectionTitle)
      .findOneAndUpdate(
        {
          _id: queueItem._id,
          state: "wait"
        },
        {
          $set: {
            state: "processing",
            beginAt: new Date().toISOString()
          }
        }
      );

    if (value === null) throw new Error("Queue item status error.");
  } catch (e) {
    throw e;
  } finally {
    await connection.close();
  }
}

export async function done(queueItem: Item<PluginJobRequest>): Promise<void> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  try {
    const { value, lastErrorObject, ok } = await connection
      .db()
      .collection(collectionTitle)
      .findOneAndUpdate(
        {
          _id: queueItem._id,
          state: "processing"
        },
        {
          $set: {
            state: "done",
            finishedAt: new Date().toISOString()
          }
        }
      );

    if (value === null) throw new Error("Queue item status error.");
  } catch (e) {
    throw e;
  } finally {
    await connection.close();
  }
}

export async function error(queueItem: Item<PluginJobRequest>): Promise<void> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  try {
    const { value, lastErrorObject, ok } = await connection
      .db()
      .collection(collectionTitle)
      .findOneAndUpdate(
        {
          _id: queueItem._id
        },
        {
          $set: {
            state: "error",
            finishedAt: new Date().toISOString()
          }
        }
      );

    if (value === null) throw new Error("Queue item status error.");
  } catch (e) {
    throw e;
  } finally {
    await connection.close();
  }
}
