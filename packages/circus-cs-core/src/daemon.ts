/**
 * This is a main job manager which contains the main loop.
 * This program is not to meant to be invoked directly.
 * @module
 */
import config from './config';
import sleep from './util/sleep';
import { bootstrapQueueSystem, bootstrapJobRunner } from './bootstrap';

const { checkQueueInterval } = config.jobManager;

let interrupted: boolean = false; // Becomes true on SIGINT

const printLog = (message: string, isError: boolean = false) => {
  console[isError ? 'error' : 'log'](new Date().toISOString() + ' ' + message);
};

async function cancellableSleep(ms: number) {
  const start = Date.now();
  while (start + ms > Date.now() && !interrupted) await sleep(100);
}

export async function main() {
  printLog(`CIRCUS CS Job Manager started. pid: ${process.pid}`);

  const jobRunner = await bootstrapJobRunner();
  const { queue, dispose } = await bootstrapQueueSystem();
  let emptyMessagePrinted = false;

  try {
    while (!interrupted) {
      try {
        const nextJob = await queue.dequeue();
        try {
          if (!nextJob) {
            if (!emptyMessagePrinted) {
              printLog('Currently the queue is empty.');
              emptyMessagePrinted = true;
            }
            await cancellableSleep(checkQueueInterval);
            continue;
          } else {
            emptyMessagePrinted = false;
          }
          await jobRunner.run(nextJob.jobId, nextJob.payload);
        } finally {
          if (nextJob) queue.settle(nextJob.jobId);
        }
      } catch (e) {
        printLog('Fatal ' + e.message, true);
      }
      await cancellableSleep(checkQueueInterval);
    }
  } finally {
    dispose();
  }

  printLog('CIRCUS CS Job Manager stopped.');
  process.exit(0);
}

process.on('SIGINT', function() {
  printLog('Signal SIGINT');
  printLog('CIRCUS CS Job Manager will be stopped on next loop.');
  interrupted = true;
});

main();
