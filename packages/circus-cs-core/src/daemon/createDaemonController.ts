/**
 * Includes PM2 wrapper functions.
 * @module
 */

// import * as aapm2 from '../util/aapm2';

import _pm2 from 'pm2';
import pify from 'pify';
import path from 'path';
import { PluginDefinition } from '../interface';
import {
  setInfoDir,
  setPluginDefinitions,
  getPluginDefinitions
} from '../util/info';

const pm2: any = pify(_pm2);

const script = 'daemon.js';

const userHomeDir =
  process.env[process.platform == 'win32' ? 'USERPROFILE' : 'HOME'];

export interface DaemonController {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  status: () => Promise<'running' | 'stopped'>;
  pm2list: () => Promise<void>;
  pm2killall: () => Promise<void>;
  updatePluginDefinitions: (
    pluginDefinitions: PluginDefinition[]
  ) => Promise<void>;
  listPluginDefinitions: () => Promise<PluginDefinition[]>;
}

interface createDaemonControllerOptions extends _pm2.StartOptions {
  // path to working directory to store plugin definitions. (Default: ~/.circus-cs-core/)
  infoDir?: string;
}

export default function createDaemonController(
  startOptions: createDaemonControllerOptions
): DaemonController {
  let { infoDir, ...pm2StartOptions } = startOptions;
  if (infoDir === undefined && userHomeDir !== undefined)
    infoDir = path.join(userHomeDir, '.circus-cs-core/');
  if (infoDir === undefined) {
    throw Error('Cannot set working directory.');
  }
  setInfoDir(infoDir);

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
      const processList = await pm2.describe(pm2StartOptions.name);
      if (processList.length > 0) return;
      await pm2.start(script, pm2StartOptions);
    });
  };

  const stop = async () => {
    return execute(async () => {
      const processList = await pm2.describe(pm2StartOptions.name);
      if (processList.length === 0) return;
      await pm2.delete(pm2StartOptions.name);
    });
  };

  const status: () => Promise<'running' | 'stopped'> = async () => {
    return execute(async () => {
      const processList = await pm2.describe(pm2StartOptions.name);
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

  const updatePluginDefinitions = async (
    pluginDefinitions: PluginDefinition[]
  ) => {
    await setPluginDefinitions(pluginDefinitions);
  };

  const listPluginDefinitions = async () => {
    return await getPluginDefinitions();
  };

  return {
    start,
    stop,
    status,
    pm2list,
    pm2killall,
    updatePluginDefinitions,
    listPluginDefinitions
  };
}
