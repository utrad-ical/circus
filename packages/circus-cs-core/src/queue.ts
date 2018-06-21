import { MongoClient } from 'mongodb';
import { PluginJobRequest as Payload } from './interface';
import config from './config';

const { mongoURL, collectionTitle } = config.queue;

export type QueueState = 'wait' | 'processing' | 'done' | 'error';

export type Item<Payload> = {
  _id?: string;
  jobId: string;
  priority: number;
  payload: Payload;
  state: QueueState;
  queuedAt?: string;
  beginAt?: string;
  finishedAt?: string;
};

/**
 * Create queue item from payload object
 */
export /* but no meaning... */ async function createItem(
  jobId: string,
  payload: Payload,
  priority: number = 0
): Promise<Item<Payload>> {
  const queueItem: Item<Payload> = {
    jobId,
    payload,
    priority,
    state: 'wait'
  };
  return queueItem;
}

/**
 * Create queue item from payload object
 */
export async function list(
  state: QueueState | 'all' = 'wait'
): Promise<Item<Payload>[]> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  let documentset: Item<Payload>[] = [];
  if (connection) {
    try {
      documentset = await connection
        .db()
        .collection(collectionTitle)
        .find<Item<Payload>>(state === 'all' ? {} : { state }, {
          sort: { priority: -1, _id: 1 }
        })
        .toArray();
    } catch (e) {
      console.error(e);
    } finally {
      await connection.close();
    }
  }
  return documentset;
}

/**
 * Basic queue functions
 */

export async function enqueue(queueItem: Item<Payload>): Promise<string> {
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

export async function dequeue(): Promise<Item<Payload> | null> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  let queueItem: Item<Payload> | null = null;
  if (connection) {
    try {
      queueItem = await connection
        .db()
        .collection(collectionTitle)
        .findOne<Item<Payload>>(
          { state: 'wait' },
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

/**
 * Change state functions
 */
export async function processing(queueItem: Item<Payload>): Promise<void> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  try {
    const { value, lastErrorObject, ok } = await connection
      .db()
      .collection(collectionTitle)
      .findOneAndUpdate(
        {
          _id: queueItem._id,
          state: 'wait'
        },
        {
          $set: {
            state: 'processing',
            beginAt: new Date().toISOString()
          }
        }
      );

    if (value === null) throw new Error('Queue item status error.');
  } catch (e) {
    throw e;
  } finally {
    await connection.close();
  }
}

export async function done(queueItem: Item<Payload>): Promise<void> {
  const connection: MongoClient | null = await MongoClient.connect(mongoURL);

  try {
    const { value, lastErrorObject, ok } = await connection
      .db()
      .collection(collectionTitle)
      .findOneAndUpdate(
        {
          _id: queueItem._id,
          state: 'processing'
        },
        {
          $set: {
            state: 'done',
            finishedAt: new Date().toISOString()
          }
        }
      );

    if (value === null) throw new Error('Queue item status error.');
  } catch (e) {
    throw e;
  } finally {
    await connection.close();
  }
}

export async function error(queueItem: Item<Payload>): Promise<void> {
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
            state: 'error',
            finishedAt: new Date().toISOString()
          }
        }
      );

    if (value === null) throw new Error('Queue item status error.');
  } catch (e) {
    throw e;
  } finally {
    await connection.close();
  }
}
