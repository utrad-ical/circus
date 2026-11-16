import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { styleText } from 'node:util';
import createSpinner from '../utils/createSpinner.ts';
import downloadToFile from '../utils/downloadToFile.ts';
import readIds from '../utils/readIds.ts';
import watchProgress from '../utils/watchProgress.ts';
import type { CommandAction } from './CommandAction.ts';

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options) => {
    const fetch = getFetch();
    const outDir = options.outdir ?? process.cwd();
    const batchSize: number = options.batchSize;
    const ids = await readIds(args, !!options.file);
    console.log(`Downloading ${ids.length} case(s)...`);

    await fs.mkdir(outDir, { recursive: true });

    const batches = Math.ceil(ids.length / batchSize);
    if (batches > 1) {
      console.log(`Split into ${batches} batches.`);
    }

    for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
      console.log(styleText('cyan', `\nBatch #${batchIdx + 1} of ${batches}`));
      const batch = ids.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);
      console.log(`Case IDs to download: ${batch.join(', ')}`);
      const spinner = createSpinner('Downloading...');
      let packed: string | undefined;
      let detail = '';
      const watcher = await watchProgress(fetch, event => {
        if (event.type === 'log') return;
        const { type, message, finished = 0, total } = event;
        if (type === 'finish') packed = '100%';
        else if (type === 'progress' && total)
          packed = `${Math.floor((finished / total) * 100)}%`;
        detail = type === 'finish' ? '' : message;
      });
      try {
        const params = new URLSearchParams({
          caseIds: batch.join(','),
          labelPackType: options.combined ? 'combined' : 'isolated',
          mhdLineEnding: options.crlf ? 'crlf' : 'lf',
          compressionFormat: options.zip ? 'zip' : 'tgz'
        });
        if (options.fullOriginalVolume) params.set('fullOriginalVolume', '1');
        if (watcher.progressId) params.set('progressId', watcher.progressId);
        const res = await fetch(`cases/export-mhd?${params}`);
        await downloadToFile(
          res,
          path.join(
            outDir,
            `batch-${String(batchIdx + 1).padStart(3, '0')}.${
              options.zip ? 'zip' : 'tgz'
            }`
          ),
          {
            spinner,
            label: size =>
              packed
                ? `Packed: ${packed}, received: ${size}` +
                  (detail ? ` | ${detail}` : '')
                : undefined
          }
        );
      } catch (err: any) {
        spinner.stop('Download failed', true);
        throw err;
      } finally {
        watcher.stop();
      }
      spinner.stop('Download complete.');
    }
  };
};

export default action;
