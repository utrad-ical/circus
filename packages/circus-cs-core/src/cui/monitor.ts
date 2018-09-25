import { table, TableUserConfig } from 'table';
import sleep from '../util/sleep';
import chalk from 'chalk';
import moment from 'moment';
import { Configuration } from '../config';
import { createModuleLoader } from '../createCsCore';

const dt = (date: Date) => {
  const m = moment(date);
  return m.format('YY-MM-DD HH:mm:ss') + ' (' + m.fromNow() + ')';
};

export default async function monitor(config: Configuration, argv: any) {
  const moduleLoader = createModuleLoader(config);
  const [queue, dispose, controller] = [
    await moduleLoader.load('queueSystem'),
    await moduleLoader.load('dispose'),
    await moduleLoader.load('daemonController')
  ];

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
      await sleep(2000);
    }
  } finally {
    dispose();
  }
}
