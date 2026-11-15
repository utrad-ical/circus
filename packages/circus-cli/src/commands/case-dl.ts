import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { styleText } from 'node:util';
import createSpinner from '../utils/createSpinner.ts';
import downloadToFile from '../utils/downloadToFile.ts';
import readIds from '../utils/readIds.ts';
import type { CommandAction } from './CommandAction.ts';

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options) => {
    const fetch = getFetch();
    const outDir = options.outdir ?? process.cwd();
    const casesPerTask: number = options.perTask;
    const ids = await readIds(args, !!options.file);
    console.log(`Downloading ${ids.length} case(s)...`);

    await fs.mkdir(outDir, { recursive: true });

    const batches = Math.ceil(ids.length / casesPerTask);
    if (batches > 1) {
      console.log(`Split into ${batches} batches.`);
    }

    for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
      console.log(styleText('cyan', `\nBatch #${batchIdx + 1} of ${batches}`));
      const batch = ids.slice(
        batchIdx * casesPerTask,
        (batchIdx + 1) * casesPerTask
      );
      console.log(`Case IDs to download: ${batch.join(', ')}`);
      const spinner = createSpinner('Downloading...');
      try {
        const params = new URLSearchParams({
          caseIds: batch.join(','),
          volume: options.entireVolume ? 'original' : 'default',
          labelPackType: options.combined ? 'combined' : 'isolated',
          mhdLineEnding: options.crlf ? 'crlf' : 'lf',
          compressionFormat: options.zip ? 'zip' : 'tgz'
        });
        const res = await fetch(`cases/export-mhd?${params}`);
        await downloadToFile(
          res,
          path.join(
            outDir,
            `batch-${String(batchIdx + 1).padStart(3, '0')}.${
              options.zip ? 'zip' : 'tgz'
            }`
          ),
          { spinner }
        );
      } catch (err: any) {
        spinner.stop('Download failed', true);
        throw err;
      }
      spinner.stop('Download complete.');
    }
  };
};

export default action;
