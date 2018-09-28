import loopRun, { LoopRunOptions } from './loopRun';
import { Item, QueueSystem } from '../queue/queue';
import sleep from '../util/sleep';
import { EventEmitter } from 'events';

const createMockLogger = (fn: jest.Mock) => {
  return {
    trace: fn,
    debug: fn,
    info: fn,
    warn: fn,
    error: fn,
    fatal: fn
  };
};

const createMockQueueSystem = <T>(len: number = 10) => {
  let q: Item<T>[] = [];
  let qId: number = 0;

  const mockQueueSystem: QueueSystem<T> = {
    list: async state => {
      if (state !== 'all') {
        return q.filter(i => i.state === state);
      } else {
        return q;
      }
    },
    enqueue: async (jobId, payload, priority: number = 0) => {
      q.push({
        jobId,
        priority,
        payload,
        state: 'wait',
        createdAt: new Date(),
        updatedAt: new Date(),
        startedAt: null
      });
      return (++qId).toString();
    },
    dequeue: async () => {
      if (q.length > 0) {
        const job = q.shift();
        job!.state = 'processing';
        return job!;
      } else {
        return null;
      }
    },
    settle: async (jobId: string) => {}
  };

  for (let i = 1; i <= len; i++) {
    mockQueueSystem.enqueue(i.toString(), {} as T);
  }

  return mockQueueSystem;
};

class MockContext extends EventEmitter {
  public pid: number = 0;
}

describe('loopRun', () => {
  let _active: boolean = true;
  test('insert a job and list it', async () => {
    const logger = jest.fn();
    const q = createMockQueueSystem<null>(3);
    const options: LoopRunOptions<null> = {
      logger: createMockLogger(logger),
      dequeue: q.dequeue,
      settle: async jobId => {
        logger('Job ' + jobId + ' settled.');
      },
      run: async (jobId, job) => !!(Number(jobId) % 2), // fails on even
      active: () => _active,
      interrupt: () => (_active = false),
      interval: async () => {
        await sleep(1);
      },
      dispose: async () => {}
    };
    const mockContext = new MockContext();
    const loop = loopRun(options, mockContext);
    await sleep(100);
    mockContext.emit('SIGINT');
    await loop;

    expect(logger.mock.calls).toEqual([
      ['CIRCUS CS Job Manager started. pid: 0'],
      ['Job 1 started.'],
      ['Job 1 finished.'],
      ['Job 1 settled.'],
      ['Job 2 started.'],
      ['Job 2 failed.'],
      ['Job 2 settled.'],
      ['Job 3 started.'],
      ['Job 3 finished.'],
      ['Job 3 settled.'],
      ['Currently the queue is empty.'],
      ['Signal SIGINT'],
      ['CIRCUS CS Job Manager will be stopped on next loop.'],
      ['CIRCUS CS Job Manager stopped.']
    ]);
  });
});
