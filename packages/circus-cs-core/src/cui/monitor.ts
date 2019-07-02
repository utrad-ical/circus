import { FunctionService } from '@utrad-ical/circus-lib';
import chalk from 'chalk';
import moment from 'moment';
import { table } from 'table';
import sleep from '../util/sleep';
import Command from './Command';
import Queue from '../job/queue/Queue';

const dt = (date: Date) => {
  const m = moment(date);
  return m.format('YY-MM-DD HH:mm:ss') + ' (' + m.fromNow() + ')';
};

const monitor: FunctionService<
  Command,
  {
    queue: Queue<circus.PluginJobRequest>;
    daemonController: circus.DaemonController;
  }
> = async (options, deps) => {
  const { queue, daemonController } = deps;

  return async (commandName, args) => {
    const interval = args.i || args.interval || 2000;
    try {
      for (;;) {
        const jobs = await queue.list('all');
        console.log('CIRCUS CS Monitor at ' + new Date().toLocaleTimeString());

        const status = await daemonController.status();
        const statusText =
          status === 'running' ? chalk.green(status) : chalk.red(status);

        const rows = jobs.map(job => {
          const text =
            job.state === 'wait'
              ? `Queued at ${dt(job.createdAt!)}`
              : job.state === 'processing'
                ? `Started at ${dt(job.startedAt!)}`
                : 'Error';
          return [
            job.jobId.substring(0, 16),
            job.state,
            job.payload.pluginId,
            text
          ];
        });
        rows.unshift(['Job ID', 'Status', 'Plugin', 'Desc']);

        console.clear();
        console.log(`Job Manager Status: ${statusText}`);
        console.log(`Number of Items in Queue: ${jobs.length}`);
        console.log(table(rows));
        await sleep(interval);
      }
    } finally {
      // dispose();
    }
  };
};

monitor.dependencies = ['queue', 'daemonController'];

export default monitor;
