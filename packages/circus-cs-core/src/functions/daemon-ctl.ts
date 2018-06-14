import * as aapm2 from '../util/aapm2';
import config from '../config';

const { script, startOptions = {} } = config.daemon;
startOptions.name = startOptions.name || 'cs-core-dequeue-daemon';

export async function start(): Promise<void> {
  // Connect to pm2
  try {
    await aapm2.connect();
  } catch (e) {
    throw e;
  }

  try {
    // Check already running.
    const processList = await aapm2.describe(startOptions.name);
    if (0 < processList.length) throw Error('Already running');

    // Start daemon
    await aapm2.start(script, startOptions);
  } catch (e) {
    throw e;
  } finally {
    await aapm2.disconnect();
  }
}

export async function stop(): Promise<void> {
  // Connect to pm2
  try {
    await aapm2.connect();
  } catch (e) {
    throw e;
  }

  try {
    // Check running.
    const processList = await aapm2.describe(startOptions.name);
    if (0 === processList.length) throw Error('Not running');

    // Stop and remove
    await aapm2.delete(startOptions.name);
  } catch (e) {
    throw e;
  } finally {
    await aapm2.disconnect();
  }
}

export async function status(): Promise<'running' | 'stopped'> {
  // Connect to pm2
  try {
    await aapm2.connect();
  } catch (e) {
    throw e;
  }

  try {
    // Check running.
    const processList = await aapm2.describe(startOptions.name);

    return 0 < processList.length ? 'running' : 'stopped';
  } catch (e) {
    throw e;
  } finally {
    await aapm2.disconnect();
  }
}

export async function pm2list(): Promise<void> {
  // Connect to pm2
  try {
    await aapm2.connect();
  } catch (e) {
    throw e;
  }

  try {
    // Check running.
    const processList = await aapm2.list();
    processList.forEach((r: aapm2.ProcessDescription) => {
      const { pid, name, pm_id, monit } = r;
      const { memory, cpu } = monit || { memory: null, cpu: null };
      console.log({
        pid,
        name,
        pm_id,
        memory,
        cpu
      });
    });
  } catch (e) {
    throw e;
  } finally {
    await aapm2.disconnect();
  }
}

export async function pm2killall(): Promise<void> {
  // Connect to pm2
  try {
    await aapm2.connect();
  } catch (e) {
    throw e;
  }

  const cbk = async (r: any) => {
    const { pid, name, pm_id, monit } = r;
    const { memory, cpu } = monit || { memory: null, cpu: null };
    console.log({
      pid,
      name,
      pm_id,
      memory,
      cpu
    });
    if (pid) await aapm2.delete(pm_id);
  };

  try {
    // Check running.
    const processList = await aapm2.list();
    const processes: any[] = [];
    processList.forEach((r: aapm2.ProcessDescription) => {
      processes.push(cbk(r));
    });
    await Promise.all(processes);
  } catch (e) {
    throw e;
  } finally {
    await aapm2.disconnect();
  }
}
