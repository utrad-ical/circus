import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import pc from 'picocolors';
import createSpinner from '../createSpinner.js';
import downloadToFile from '../downloadToFile.js';
import CommandAction from './CommandAction.js';

const createCommand: CommandAction = ({ getFetch }) => {
  return async (args: string[], options) => {
    const fetch = getFetch();
    const outDir = options.outdir ?? process.cwd();
    const casesPerTask = Number(options.perTask) ?? 10;
    const ids = !!options.file
      ? await (async () => {
          if (args.length > 1)
            throw new Error('You cannot specify more than one ID file.');
          return (await fs.readFile(args[0], 'utf8'))
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length && !line.startsWith('#'));
        })()
      : args;
    console.log(`Downloading ${ids.length} case(s)...`);

    await fs.mkdir(outDir, { recursive: true });

    const batches = Math.ceil(ids.length / casesPerTask);
    if (batches > 1) {
      console.log(`Tasks were split into ${batches} batches.`);
    }

    for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
      console.log(pc.cyan(`\nBatch #${batchIdx + 1} of ${batches}`));
      const batch = ids.slice(
        batchIdx * casesPerTask,
        (batchIdx + 1) * casesPerTask
      );
      console.log(`Case IDs to download: ${batch.join(', ')}`);
      const spinner = createSpinner('Registering an export task...', true);
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
        const taskId = (await res1.json()).taskId;
        spinner.tick('Waiting for export task to complete...');
        while (true) {
          const res2 = await fetch(`tasks/${taskId}`);
          const task = await res2.json();
          if (task.status === 'finished') {
            spinner.tick('Task completed. Waiting for download...');
            break;
          }
          if (task.status === 'error') {
            spinner.stop('Task failed.', true);
            console.error(
              pc.bgRed(`Export task ${taskId} (batch ${batchIdx + 1}) failed.`)
            );
            console.error(pc.red(`Task error message: ${task.errorMessage}`));
            throw new Error(`Export task failed.`);
          }
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        const res3 = await fetch(`tasks/${taskId}/download`);
        spinner.setAutoTick(false);
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

        spinner.setAutoTick(true);
        spinner.tick('Marking the task as finished...');
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
  };
};

export default createCommand;
