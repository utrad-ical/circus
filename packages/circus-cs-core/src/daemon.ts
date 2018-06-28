/**
 * This is a main job manager which contains the main loop.
 * This program is not to meant to be invoked directly.
 * @module
 */

import processNextJob from './functions/process-next-job';
import config from './config';
import sleep from './util/sleep';

const { tick, waitOnFail } = config.daemon;

let exec: boolean = true;

const printLog = (message: string, isError: boolean = false) => {
  console[isError ? 'error' : 'log'](new Date().toISOString() + ' ' + message);
};

process.on('SIGINT', function() {
  printLog('Signal SIGINT');
  printLog('Dequeue daemon will be stopped on next dequeue.');
  exec = false;
});

export async function main() {
  printLog(`Dequeue daemon started. pid: ${process.pid}`);

  let lastIsEmpty = false; // Flag to avoid printing too many 'Queue empty'
  do {
    try {
      const result = await processNextJob();
      if (result === null) {
        if (!lastIsEmpty) printLog('Queue empty');
        lastIsEmpty = true;
      } else {
        lastIsEmpty = false;
        printLog(result ? 'Succeeded' : 'Failed');
        if (!result && waitOnFail && exec) await sleep(waitOnFail);
      }
    } catch (e) {
      printLog('Fatal ' + e.message, true);
    }
    await sleep(tick);
  } while (exec);

  printLog('Dequeue daemon stopped.');
  process.exit(0);
}

main();
