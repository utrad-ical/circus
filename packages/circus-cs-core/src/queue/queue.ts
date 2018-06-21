import { MongoClient, Collection } from 'mongodb';
import { PluginJobRequest as Payload } from '../interface';
import config from '../config';

export type QueueState = 'wait' | 'processing' | 'done' | 'error';

export type Item<T> = {
  _id?: string;
  jobId: string;
  priority: number;
  payload: T;
  state: QueueState;
  queuedAt?: string;
  startedAt?: string;
  finishedAt?: string;
};

/**
 * Create queue item from payload object
 */
// TODO: Do we really have to export this?
// TODO: Why is this async?
export async function createItem(
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

interface QueueSystem {
  list: (state?: QueueState | 'all') => Promise<Item<Payload>[]>;
  enqueue: (queueItem: Item<Payload>) => Promise<string>;
  dequeue: () => Promise<Item<Payload> | null>;
  dispose: () => Promise<void>;
  processing: (queueItem: Item<Payload>) => Promise<void>;
  done: (queueItem: Item<Payload>) => Promise<void>;
  error: (queueItem: Item<Payload>) => Promise<void>;
}

interface QueueOptions {
  mongoUrl: string;
  collectionName: string;
}

export async function craeteMongoQueue(
  options: QueueOptions
): Promise<QueueSystem> {
  const { mongoUrl, collectionName } = options;

  let connection: MongoClient | undefined;
  let collection: Collection | undefined;

  const getCollection = async (): Promise<Collection> => {
    if (collection) return collection;
    connection = await MongoClient.connect(mongoUrl);
    collection = connection.db().collection(collectionName);
    return collection;
  };

  const list = async function(state: QueueState | 'all' = 'wait') {
    const collection = await getCollection();
    const statusFilter = state === 'all' ? {} : { state };
    return await collection
      .find<Item<Payload>>(statusFilter, { sort: { priority: -1, _id: 1 } })
      .toArray();
  };

  const enqueue = async (queueItem: Item<Payload>) => {
    const collection = await getCollection();
    queueItem.queuedAt = new Date().toISOString();
    const { insertedId } = await collection.insertOne(queueItem);
    return insertedId.toString();
  };

  const dequeue = async () => {
    const collection = await getCollection();
    return await collection.findOne<Item<Payload>>(
      { state: 'wait' },
      { sort: { priority: -1, _id: 1 }, limit: 1 }
    );
  };

  const processing = async (queueItem: Item<Payload>) => {
    const collection = await getCollection();
    const { value } = await collection.findOneAndUpdate(
      { _id: queueItem._id, state: 'wait' },
      { $set: { state: 'processing', startedAt: new Date().toISOString() } }
    );
    if (value === null) throw new Error('Queue item status error.');
  };

  const done = async (queueItem: Item<Payload>) => {
    const collection = await getCollection();
    const { value, lastErrorObject, ok } = await collection.findOneAndUpdate(
      { _id: queueItem._id, state: 'processing' },
      { $set: { state: 'done', finishedAt: new Date().toISOString() } }
    );
    if (value === null) throw new Error('Queue item status error.');
  };

  const error = async (queueItem: Item<Payload>) => {
    const collection = await getCollection();
    const { value, lastErrorObject, ok } = await collection.findOneAndUpdate(
      { _id: queueItem._id },
      { $set: { state: 'error', finishedAt: new Date().toISOString() } }
    );
    if (value === null) throw new Error('Queue item status error.');
  };

  const dispose = async function() {
    if (!connection) return;
    await connection.close();
  };

  return { list, enqueue, dequeue, processing, done, error, dispose };
}

// TODO: We will remove this as soon as possible
const tentativeSingletonQueue = craeteMongoQueue({
  mongoUrl: config.queue.mongoURL,
  collectionName: config.queue.collectionTitle
});

export async function list(state: QueueState | 'all' = 'wait') {
  return (await tentativeSingletonQueue).list(state);
}

export async function enqueue(queueItem: Item<Payload>) {
  return (await tentativeSingletonQueue).enqueue(queueItem);
}

export async function dequeue() {
  return (await tentativeSingletonQueue).dequeue();
}

export async function processing(queueItem: Item<Payload>) {
  return (await tentativeSingletonQueue).processing(queueItem);
}

export async function done(queueItem: Item<Payload>) {
  return (await tentativeSingletonQueue).done(queueItem);
}

export async function error(queueItem: Item<Payload>) {
  return (await tentativeSingletonQueue).error(queueItem);
}
