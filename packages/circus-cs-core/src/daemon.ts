/**
 * This is a main job manager which contains the main loop.
 * This program is not to meant to be invoked directly.
 * @module
 */

import processNextJob from './functions/process-next-job';
import config from './config';

const { tick, waitOnFail } = config.daemon;

let exec: boolean = true;

process.on('SIGINT', function() {
  console.log('signal SIGINT');
  console.log(
    new Date().toISOString() +
      ' Dequeue daemon will be stopped on next dequeue.'
  );
  exec = false;
});

export async function main(): Promise<void> {
  console.log(
    new Date().toISOString() + ' Dequeue daemon started. pid:' + process.pid
  );

  let lastIsEmpty = false;
  do {
    try {
      const result = await processNextJob();
      if (result === null) {
        if (!lastIsEmpty)
          console.log(new Date().toISOString() + ' Queue empty');
        lastIsEmpty = true;
      } else {
        lastIsEmpty = false;
        console.log(
          new Date().toISOString() + (result ? ' Succeeded' : ' Failed')
        );

        if (!result && waitOnFail && exec)
          await (() => new Promise((a, b) => setTimeout(a, waitOnFail)))();
      }
    } catch (e) {
      console.error(new Date().toISOString() + ' Fatal ' + e.message);
    }

    await (() => new Promise((a, b) => setTimeout(a, tick)))();
  } while (exec);

  console.log(new Date().toISOString() + ' Dequeue daemon stopped.');

  process.exit(0);
}

main();
