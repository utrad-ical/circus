import { table, TableUserConfig } from 'table';
import { bootstrapQueueSystem, bootstrapDaemonController } from '../bootstrap';
import sleep from '../util/sleep';
import chalk from 'chalk';
import moment from 'moment';

const dt = (date: Date) => {
  const m = moment(date);
  return m.format('YY-MM-DD HH:mm:ss') + ' (' + m.fromNow() + ')';
};

export default async function monitor(argv: any) {
  const { queue, dispose } = await bootstrapQueueSystem();
  const controller = await bootstrapDaemonController();
  try {
    for (;;) {
      const jobs = await queue.list('all');
      console.log('CIRCUS CS Monitor at ' + new Date().toLocaleTimeString());

      const status = await controller.status();
      const statusText =
        status === 'running' ? chalk.green(status) : chalk.red(status);

      const rows = jobs.map(job => {
        const text =
          job.state === 'wait'
            ? `Queued at ${dt(job.queuedAt!)}`
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
      await sleep(2000);
    }
  } finally {
    dispose();
  }
}
