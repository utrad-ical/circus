export type QueueState = 'wait' | 'processing';

export default interface Queue<T> {
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
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
}
