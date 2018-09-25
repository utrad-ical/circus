import Logger from '../logger/Logger';
import { Item } from '../queue/queue';

export interface LoopRunOptions<T> {
  logger: Logger;
  active(): boolean;
  dequeue(): Promise<Item<T> | null>;
  run(jobId: string, job: T): Promise<boolean>;
  settle(jobId: string): Promise<void>;
  interval(): Promise<void>;
  interrupt(): void;
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
  const {
    logger,
    active,
    dequeue,
    run,
    settle,
    interval,
    dispose,
    interrupt
  } = deps;

  logger.info(`CIRCUS CS Job Manager started. pid: ${context.pid}`);

  context.on('SIGINT', function() {
    logger.info('Signal SIGINT');
    logger.info('CIRCUS CS Job Manager will be stopped on next loop.');
    interrupt();
  });

  const once = messageOnce(logger.info);
  try {
    while (active()) {
      try {
        const nextJob = await dequeue();
        try {
          if (!nextJob) {
            once.print('Currently the queue is empty.');
            await interval();
            continue;
          }
          once.reset();

          logger.info(`Job ${nextJob.jobId} started.`);
          const succeed = await run(nextJob.jobId, nextJob.payload);
          logger.info(
            `Job ${nextJob.jobId} ${succeed ? 'finished' : 'failed'}.`
          );
        } finally {
          if (nextJob) await settle(nextJob.jobId);
        }
      } catch (e) {
        logger.fatal(e.message);
      }
      await interval();
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
