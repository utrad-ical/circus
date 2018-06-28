/**
 * Includes PM2 wrapper functions.
 * @module
 */

// import * as aapm2 from '../util/aapm2';

import * as _pm2 from 'pm2';
import * as pify from 'pify';

const pm2: any = pify(_pm2);

const script = 'daemon.js';

interface Options {
  name: string;
  cwd: string;
  output: string;
  error: string;
}

export default function createDaemonController(startOptions: Options) {
  const execute = async (task: Function) => {
    await pm2.connect();
    try {
      return await task();
    } finally {
      pm2.disconnect();
    }
  };

  const start = async () => {
    execute(async () => {
      const processList = await pm2.describe(startOptions.name);
      if (processList.length > 0) throw new Error('Daemon already running.');
      await pm2.start(script, startOptions);
    });
  };

  const stop = async () => {
    execute(async () => {
      const processList = await pm2.describe(startOptions.name);
      if (processList.length === 0) throw Error('Daemon is not running');
      await pm2.delete(startOptions.name);
    });
  };

  const status: () => Promise<'running' | 'stopped'> = async () => {
    return execute(async () => {
      const processList = await pm2.describe(startOptions.name);
      return processList.length > 0 ? 'running' : 'stopped';
    });
  };

  const pm2list = async () => {
    return execute(async () => {
      const processList = (await pm2.list()) as _pm2.ProcessDescription[];
      processList.forEach(process => {
        const { pid, name, pm_id, monit } = process;
        const { memory, cpu } = monit || { memory: null, cpu: null };
        console.log({ pid, name, pm_id, memory, cpu });
      });
    });
  };

  const pm2killall = async () => {
    execute(async () => {
      const killAndPrint = async (r: _pm2.ProcessDescription) => {
        const { pid, name, pm_id, monit } = r;
        const { memory, cpu } = monit || { memory: null, cpu: null };
        console.log({ pid, name, pm_id, memory, cpu });
        if (pid && pm_id) await pm2.delete(pm_id);
      };
      const processList = (await pm2.list()) as _pm2.ProcessDescription[];
      await Promise.all(processList.map(r => killAndPrint(r)));
    });
  };

  return { start, stop, status, pm2list, pm2killall };
}
