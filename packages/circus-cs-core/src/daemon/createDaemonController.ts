/**
 * Includes PM2 wrapper functions.
 * @module
 */

// import * as aapm2 from '../util/aapm2';

import _pm2 from 'pm2';
import pify from 'pify';

const pm2: any = pify(_pm2);

const script = 'daemon.js';

export interface DaemonController {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  status: () => Promise<'running' | 'stopped'>;
  pm2list: () => Promise<void>;
  pm2killall: () => Promise<void>;
}

export default function createDaemonController(
  startOptions: _pm2.StartOptions
): DaemonController {
  const execute = async (task: Function) => {
    await pm2.connect();
    try {
      return await task();
    } finally {
      await pm2.disconnect();
    }
  };

  const start = async () => {
    return execute(async () => {
      const processList = await pm2.describe(startOptions.name);
      if (processList.length > 0) return;
      await pm2.start(script, startOptions);
    });
  };

  const stop = async () => {
    return execute(async () => {
      const processList = await pm2.describe(startOptions.name);
      if (processList.length === 0) return;
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
      return processList.map(process => {
        const { pid, name, pm_id, monit } = process;
        const { memory, cpu } = monit || { memory: null, cpu: null };
        return { pid, name, pm_id, memory, cpu };
      });
    });
  };

  const pm2killall = async () => {
    return execute(async () => {
      const killAndPrint = async (r: _pm2.ProcessDescription) => {
        const { pid, name, pm_id, monit } = r;
        const { memory, cpu } = monit || { memory: null, cpu: null };
        // console.log({ pid, name, pm_id, memory, cpu });
        if (pid && pm_id) await pm2.delete(pm_id);
      };
      const processList = (await pm2.list()) as _pm2.ProcessDescription[];
      await Promise.all(processList.map(r => killAndPrint(r)));
    });
  };

  return { start, stop, status, pm2list, pm2killall };
}
