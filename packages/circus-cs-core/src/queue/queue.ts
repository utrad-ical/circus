import { Collection } from 'mongodb';

export type QueueState = 'wait' | 'processing';

export interface QueueSystem<T> {
  /**
   * Returns the list of current jobs and their status.
   */
  list: (state?: QueueState | 'all') => Promise<Item<T>[]>;

  /**
   * Registers a ner job.
   */
  enqueue: (jobId: string, payload: T, priority?: number) => Promise<string>;

  /**
   * Returns the next job while marking it as 'processing'.
   */
  dequeue: () => Promise<Item<T> | null>;

  /**
   * Removes the job from queue.
   */
  settle: (jobId: string) => Promise<void>;
}

export interface Item<T> {
  _id?: string;
  jobId: string;
  priority: number;
  payload: T;
  state: QueueState;
  queuedAt?: Date;
  startedAt?: Date;
}

interface QueueOptions {
  collection: Collection;
}

export async function craeteMongoQueue<T>(
  options: QueueOptions
): Promise<QueueSystem<T>> {
  const { collection } = options;

  await collection.createIndex({ jobId: 1 }, { unique: true });

  const list = async function(state: QueueState | 'all' = 'wait') {
    const statusFilter = state === 'all' ? {} : { state };
    return await collection
      .find<Item<T>>(statusFilter, { sort: { priority: -1, _id: 1 } })
      .toArray();
  };

  const enqueue = async (jobId: string, payload: T, priority: number = 0) => {
    const item: Item<T> = {
      jobId,
      state: 'wait',
      payload,
      queuedAt: new Date(),
      priority
    };
    const { insertedId } = await collection.insertOne(item);
    return insertedId.toString();
  };

  const dequeue = async () => {
    const result = (await collection.findOneAndUpdate(
      { state: 'wait' },
      { $set: { state: 'processing' } },
      { sort: { priority: -1, _id: 1 }, returnOriginal: false }
    )).value as Item<T> | null;
    return result;
  };

  const settle = async (jobId: string) => {
    const result = await collection.findOneAndDelete({
      jobId,
      state: 'processing'
    });
    if (!result.value)
      throw new Error('Tried to mark a job as done before it gets started.');
  };

  return { list, enqueue, dequeue, settle };
}
