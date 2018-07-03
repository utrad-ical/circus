import { table, TableUserConfig } from 'table';
import { bootstrapQueueSystem, bootstrapDaemonController } from '../bootstrap';
import sleep from '../util/sleep';
import chalk from 'chalk';

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
        return [
          job.jobId.substring(0, 16),
          job.state,
          job.payload.pluginId,
          job.queuedAt
        ];
      });
      rows.unshift(['Job ID', 'Status', 'Plugin', 'Queued At']);

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
