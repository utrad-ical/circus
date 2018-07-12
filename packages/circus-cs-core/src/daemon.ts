/**
 * This is a main job manager which contains the main loop.
 * This program is not to meant to be invoked directly.
 * @module
 */
import config from './config';
import sleep from './util/sleep';
import {
  bootstrapQueueSystem,
  bootstrapJobRunner,
  bootstrapDicomFileRepository
} from './bootstrap';

const { checkQueueInterval } = config.jobManager;

/** The flag that becomes true on SIGINT. */
let interrupted: boolean = false;

type LoggerFunction = (message: string) => void;

interface Logger {
  info: LoggerFunction;
  log: LoggerFunction;
  error: LoggerFunction;
}
async function cancellableSleep(ms: number) {
  const start = Date.now();
  while (start + ms > Date.now() && !interrupted) await sleep(100);
}

export async function main(logger: Logger) {
  logger.log(`CIRCUS CS Job Manager started. pid: ${process.pid}`);

  const dicomRepository = await bootstrapDicomFileRepository();
  const jobRunner = await bootstrapJobRunner(dicomRepository);
  const { queue, dispose } = await bootstrapQueueSystem();
  let emptyMessagePrinted = false;

  try {
    while (!interrupted) {
      try {
        const nextJob = await queue.dequeue();
        try {
          if (!nextJob) {
            if (!emptyMessagePrinted) {
              logger.log('Currently the queue is empty.');
              emptyMessagePrinted = true;
            }
            await cancellableSleep(checkQueueInterval);
            continue;
          }
          emptyMessagePrinted = false;
          logger.log(`Job ${nextJob.jobId} started.`);
          const succeed = await jobRunner.run(nextJob.jobId, nextJob.payload);
          logger.log(
            `Job ${nextJob.jobId} ${succeed ? 'finished' : 'failed'}.`
          );
        } finally {
          if (nextJob) queue.settle(nextJob.jobId);
        }
      } catch (e) {
        logger.error('Fatal ' + e.message);
      }
      await cancellableSleep(checkQueueInterval);
    }
  } finally {
    dispose();
  }

  logger.log('CIRCUS CS Job Manager stopped.');
  process.exit(0);
}

const logTo = (logLevel: string) => {
  return (message: string) =>
    (console as any)[logLevel](
      new Date().toISOString() + ' ' + message
    ) as LoggerFunction;
};

const defaultLogger: Logger = {
  info: logTo('info'),
  log: logTo('log'),
  error: logTo('error')
};

process.on('SIGINT', function() {
  defaultLogger.log('Signal SIGINT');
  defaultLogger.log('CIRCUS CS Job Manager will be stopped on next loop.');
  interrupted = true;
});

main(defaultLogger);
