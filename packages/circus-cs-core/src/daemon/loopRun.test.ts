import assert from 'node:assert/strict';
import { describe, test, mock } from 'node:test';
import type { Mock } from 'node:test';
import type { LoopRunOptions } from './loopRun.ts';
import loopRun from './loopRun.ts';
import sleep from '../util/sleep.ts';
import { EventEmitter } from 'events';
import type * as circus from '../interface.ts';
import type { Logger } from '@utrad-ical/circus-lib';

const createMockLogger = (fn: Mock<(...args: any[]) => any>) => {
  const logger: Logger = {
    trace: fn,
    debug: fn,
    info: fn,
    warn: fn,
    error: fn,
    fatal: fn,
    child: () => logger
  };
  return logger;
};

const createMockQueueSystem = <T>(
  len: number = 10,
  fn: Mock<(...args: any[]) => any>
) => {
  const q: circus.QueueItem<T>[] = [];
  let qId: number = 0;

  const mockQueueSystem: circus.Queue<T> = {
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
    settle: async (jobId: string) => {
      fn('Job ' + jobId + ' settled.');
    }
  };

  for (let i = 1; i <= len; i++) {
    mockQueueSystem.enqueue(i.toString(), {} as T);
  }

  return mockQueueSystem;
};

describe('loopRun', () => {
  let _active: boolean = true;
  test('processes the queue and shuts down on SIGINT', async () => {
    const fn = mock.fn();
    const queue = createMockQueueSystem<null>(3, fn);
    const options: LoopRunOptions<null> = {
      logger: createMockLogger(fn),
      queue,
      run: async (jobId, job) => !!(Number(jobId) % 2), // fails on even
      cancellableTimer: {
        isActive: () => _active,
        cancel: () => (_active = false),
        waitForNext: async () => {
          await sleep(1);
        }
      },
      dispose: async () => {}
    };
    const mockContext = new EventEmitter();
    const loop = loopRun(options, mockContext);
    await sleep(100);
    mockContext.emit('SIGINT');
    await loop;

    assert.deepEqual(
      fn.mock.calls.map(c => c.arguments),
      [
        ['CIRCUS CS Job Manager started.'],
        [{ jobId: '1' }, 'Job started'],
        [{ jobId: '1', succeeded: true }, 'Job completed'],
        ['Job 1 settled.'],
        [{ jobId: '2' }, 'Job started'],
        [{ jobId: '2', succeeded: false }, 'Job completed'],
        ['Job 2 settled.'],
        [{ jobId: '3' }, 'Job started'],
        [{ jobId: '3', succeeded: true }, 'Job completed'],
        ['Job 3 settled.'],
        ['Currently the queue is empty.'],
        ['Signal SIGINT'],
        ['CIRCUS CS Job Manager will be stopped on next loop.'],
        ['CIRCUS CS Job Manager stopped.']
      ]
    );
  });
});
