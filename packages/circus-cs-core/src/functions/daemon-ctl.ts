/**
 * Includes PM2 wrapper functions.
 * @module
 */

import * as aapm2 from '../util/aapm2';
import config from '../config';

const { script, startOptions = {} } = config.daemon;
startOptions.name = startOptions.name || 'cs-core-dequeue-daemon';

export async function start(): Promise<void> {
  try {
    await aapm2.connect();
    // Check if the daemon is already running.
    const processList = await aapm2.describe(startOptions.name);
    if (processList.length > 0) throw new Error('Daemon already running.');
    // Start daemon
    await aapm2.start(script, startOptions);
  } finally {
    await aapm2.disconnect();
  }
}

export async function stop(): Promise<void> {
  try {
    await aapm2.connect();
    // Check running.
    const processList = await aapm2.describe(startOptions.name);
    if (processList.length === 0) throw Error('Daemon is not running');
    // Stop and remove
    await aapm2.delete(startOptions.name);
  } finally {
    await aapm2.disconnect();
  }
}

export async function status(): Promise<'running' | 'stopped'> {
  try {
    await aapm2.connect();
    // Check running.
    const processList = await aapm2.describe(startOptions.name);
    return processList.length > 0 ? 'running' : 'stopped';
  } finally {
    await aapm2.disconnect();
  }
}

export async function pm2list(): Promise<void> {
  try {
    await aapm2.connect();
    // Check running.
    const processList = await aapm2.list();
    processList.forEach((r: aapm2.ProcessDescription) => {
      const { pid, name, pm_id, monit } = r;
      const { memory, cpu } = monit || { memory: null, cpu: null };
      console.log({ pid, name, pm_id, memory, cpu });
    });
  } finally {
    await aapm2.disconnect();
  }
}

export async function pm2killall(): Promise<void> {
  const killAndPrint = async (r: aapm2.ProcessDescription) => {
    const { pid, name, pm_id, monit } = r;
    const { memory, cpu } = monit || { memory: null, cpu: null };
    console.log({ pid, name, pm_id, memory, cpu });
    if (pid && pm_id) await aapm2.delete(pm_id);
  };

  try {
    await aapm2.connect();
    const processList = await aapm2.list();
    await Promise.all(processList.map(r => killAndPrint(r)));
  } finally {
    await aapm2.disconnect();
  }
}
