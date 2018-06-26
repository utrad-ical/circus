/**
 * Includes PM2 wrapper functions.
 * @module
 */

import * as aapm2 from '../util/aapm2';

const script = 'daemon.js';

interface Options {
  name: string;
  cwd: string;
  output: string;
  error: string;
}

export default function createDaemonController(startOptions: Options) {
  const execute = async (task: Function) => {
    await aapm2.connect();
    try {
      return await task();
    } finally {
      aapm2.disconnect();
    }
  };

  const start = async () => {
    execute(async () => {
      const processList = await aapm2.describe(startOptions.name);
      if (processList.length > 0) throw new Error('Daemon already running.');
      await aapm2.start(script, startOptions);
    });
  };

  const stop = async () => {
    execute(async () => {
      const processList = await aapm2.describe(startOptions.name);
      if (processList.length === 0) throw Error('Daemon is not running');
      await aapm2.delete(startOptions.name);
    });
  };

  const status: () => Promise<'running' | 'stopped'> = async () => {
    return execute(async () => {
      const processList = await aapm2.describe(startOptions.name);
      return processList.length > 0 ? 'running' : 'stopped';
    });
  };

  const pm2list = async () => {
    return execute(async () => {
      const processList = await aapm2.list();
      processList.forEach(process => {
        const { pid, name, pm_id, monit } = process;
        const { memory, cpu } = monit || { memory: null, cpu: null };
        console.log({ pid, name, pm_id, memory, cpu });
      });
    });
  };

  const pm2killall = async () => {
    execute(async () => {
      const killAndPrint = async (r: aapm2.ProcessDescription) => {
        const { pid, name, pm_id, monit } = r;
        const { memory, cpu } = monit || { memory: null, cpu: null };
        console.log({ pid, name, pm_id, memory, cpu });
        if (pid && pm_id) await aapm2.delete(pm_id);
      };
      const processList = await aapm2.list();
      await Promise.all(processList.map(r => killAndPrint(r)));
    });
  };

  return { start, stop, status, pm2list, pm2killall };
}
