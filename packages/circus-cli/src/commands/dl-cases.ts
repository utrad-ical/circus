import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import pc from 'picocolors';
import createSpinner from '../utils/createSpinner.js';
import downloadToFile from '../utils/downloadToFile.js';
import readIds from '../utils/readIds.js';
import taskReporter, { TaskEvent } from '../utils/taskReporter.js';
import CommandAction from './CommandAction.js';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options) => {
    const fetch = getFetch();
    const outDir = options.outdir ?? process.cwd();
    const casesPerTask = Number(options.perTask) ?? 10;
    const ids = await readIds(args, !!options.file);
    console.log(`Downloading ${ids.length} case(s)...`);

    await fs.mkdir(outDir, { recursive: true });

    const batches = Math.ceil(ids.length / casesPerTask);
    if (batches > 1) {
      console.log(`Tasks were split into ${batches} batches.`);
    }

    const taskReports = taskReporter(fetch);

    try {
      for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
        console.log(pc.cyan(`\nBatch #${batchIdx + 1} of ${batches}`));
        const batch = ids.slice(
          batchIdx * casesPerTask,
          (batchIdx + 1) * casesPerTask
        );
        console.log(`Case IDs to download: ${batch.join(', ')}`);
        const spinner = createSpinner('Registering an export task...');
        try {
          const res1 = await fetch('cases/export-mhd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caseIds: batch,
              labelPackType: options.combined ? 'combined' : 'isolated',
              mhdLineEnding: options.crlf ? 'crlf' : 'lf',
              compressionFormat: options.zip ? 'zip' : 'tgz'
            })
          });
          const taskId = ((await res1.json()) as { taskId: string }).taskId;
          spinner.update('Waiting for export task to complete...');

          // Wait for the task to complete.
          await new Promise<void>((resolve, reject) => {
            const handler = (event: TaskEvent) => {
              if (event.taskId !== taskId) return;
              switch (event.type) {
                case 'finish':
                  taskReports.events.off('event', handler);
                  resolve();
                  break;
                case 'progress':
                  spinner.update(
                    `Waiting for export task to complete: ${event.message}`
                  );
                  break;
                case 'error':
                  taskReports.events.off('event', handler);
                  reject('Task did not complete: ' + event.message);
                  break;
              }
            };
            taskReports.events.on('event', handler);
          });
          spinner.update('Task completed. Downloading...');
          await delay(500);

          const res3 = await fetch(`tasks/${taskId}/download`);
          await downloadToFile(
            res3,
            path.join(
              outDir,
              `batch-${String(batchIdx + 1).padStart(3, '0')}.${
                options.zip ? 'zip' : 'tgz'
              }`
            ),
            { spinner }
          );

          spinner.update('Marking the task as finished...');
          await fetch(`tasks/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dismissed: true })
          });
        } catch (err: any) {
          spinner.stop('Task failed', true);
          throw err;
        }
        spinner.stop('Download complete.');
      }
    } finally {
      taskReports.stop();
    }
  };
};

export default action;
