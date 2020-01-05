import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import { CancellableTimer } from './createCancellableTimer';
import * as circus from '../interface';

export interface LoopRunOptions<T> {
  logger: Logger;
  queue: circus.Queue<T>;
  run(jobId: string, job: T): Promise<boolean>;
  cancellableTimer: CancellableTimer;
  dispose(): Promise<void>;
}

interface Context {
  pid: number;
  on(sig: 'SIGINT', callback: () => any): void;
}

export default async function loopRun<T>(
  deps: LoopRunOptions<T>,
  context: Context
) {
  const { logger, queue, run, cancellableTimer, dispose } = deps;

  logger.info(`CIRCUS CS Job Manager started. pid: ${context.pid}`);

  context.on('SIGINT', function() {
    logger.info('Signal SIGINT');
    logger.info('CIRCUS CS Job Manager will be stopped on next loop.');
    cancellableTimer.cancel();
  });

  const once = messageOnce(logger.info);
  try {
    while (cancellableTimer.isActive()) {
      try {
        const nextJob = await queue.dequeue();
        try {
          if (!nextJob) {
            once.print('Currently the queue is empty.');
            await cancellableTimer.waitForNext();
            continue;
          }
          once.reset();

          logger.info(`Job ${nextJob.jobId} started.`);
          const succeed = await run(nextJob.jobId, nextJob.payload);
          logger.info(
            `Job ${nextJob.jobId} ${succeed ? 'finished' : 'failed'}.`
          );
        } finally {
          if (nextJob) await queue.settle(nextJob.jobId);
        }
      } catch (e) {
        logger.fatal(e.message);
      }
      await cancellableTimer.waitForNext();
    }
  } finally {
    await dispose();
  }

  logger.info('CIRCUS CS Job Manager stopped.');
}

function messageOnce(fn: (msg: string) => void) {
  let messaged: boolean = false;
  return {
    print: (msg: string) => !messaged && (messaged = true) && fn(msg),
    reset: () => (messaged = false)
  };
}
