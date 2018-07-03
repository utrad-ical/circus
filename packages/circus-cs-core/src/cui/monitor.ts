import { table, TableUserConfig } from 'table';
import { bootstrapQueueSystem } from '../bootstrap';
import sleep from '../util/sleep';
import chalk from 'chalk';

export default async function monitor(argv: any) {
  const { queue, dispose } = await bootstrapQueueSystem();
  try {
    for (;;) {
      console.clear();
      const jobs = await queue.list('all');
      console.log('CIRCUS CS Job Queue at ' + new Date().toLocaleTimeString());

      const item = jobs.length === 1 ? 'item' : 'items';
      console.log(chalk.bold(`${jobs.length} ${item} in queue`));

      const rows = jobs.map(job => {
        return [
          job.jobId.substring(0, 16),
          job.state,
          job.payload.pluginId,
          job.queuedAt
        ];
      });
      rows.unshift(['Job ID', 'Status', 'Plugin', 'Queued At']);

      console.log(table(rows));
      await sleep(1000);
    }
  } finally {
    dispose();
  }
}
