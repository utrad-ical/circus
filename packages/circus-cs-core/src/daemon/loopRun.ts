import type { Logger } from '@utrad-ical/circus-lib';
import type { CancellableTimer } from './createCancellableTimer.ts';
import type * as circus from '../interface.ts';

export interface LoopRunOptions<T> {
  logger: Logger;
  queue: circus.Queue<T>;
  run(jobId: string, job: T): Promise<boolean>;
  cancellableTimer: CancellableTimer;
  dispose(): Promise<void>;
}

interface Context {
  on(sig: 'SIGINT', callback: () => any): void;
}

export default async function loopRun<T>(
  deps: LoopRunOptions<T>,
  context: Context
) {
  const { logger, queue, run, cancellableTimer, dispose } = deps;

  logger.info('CIRCUS CS Job Manager started.');

  context.on('SIGINT', function () {
    logger.info('Signal SIGINT');
    logger.info('CIRCUS CS Job Manager will be stopped on next loop.');
    cancellableTimer.cancel();
  });

  const once = messageOnce(message => logger.info(message));
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

          logger.info({ jobId: nextJob.jobId }, 'Job started');
          const succeed = await run(nextJob.jobId, nextJob.payload);
          logger.info(
            { jobId: nextJob.jobId, succeeded: succeed },
            'Job completed'
          );
        } finally {
          if (nextJob) await queue.settle(nextJob.jobId);
        }
      } catch (err) {
        logger.fatal({ err }, 'Job manager loop failed');
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
