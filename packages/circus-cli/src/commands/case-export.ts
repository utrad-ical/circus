import type { CaseExportMhdQuery } from '@utrad-ical/circus-api-schema';
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
    const ids = await readIds(args, !!options.file);
    if (!ids.length) throw new Error('No case IDs found in the input files.');

    const fetch = getFetch();
    const outDir = options.outdir ?? process.cwd();
    const batchSize: number = options.skipOnError ? 1 : options.batchSize;
    await fs.mkdir(outDir, { recursive: true });
    const existing = (await fs.readdir(outDir)).find(name =>
      /^batch-\d{3,}\.(tgz|zip)$/i.test(name)
    );
    if (existing) {
      throw new Error(
        `Output archive already exists: ${path.join(outDir, existing)}. Choose another output directory with --outdir.`
      );
    }

    console.log(`Downloading ${ids.length} case(s)...`);
    const batches = Math.ceil(ids.length / batchSize);
    if (batches > 1) {
      console.log(`Split into ${batches} batches.`);
    }

    let failed = 0;
    for (let batchIdx = 0; batchIdx < batches; batchIdx++) {
      console.log(styleText('cyan', `\nBatch #${batchIdx + 1} of ${batches}`));
      const batch = ids.slice(batchIdx * batchSize, (batchIdx + 1) * batchSize);
      console.log(`Case IDs to download: ${batch.join(', ')}`);
      const batchNumber = String(batchIdx + 1).padStart(3, '0');
      const filename = `batch-${batchNumber}.${options.zip ? 'zip' : 'tgz'}`;
      const outputPath = path.join(outDir, filename);
      const stagingDir = await fs.mkdtemp(path.join(outDir, '.case-export-'));
      const downloadPath = path.join(stagingDir, filename);
      const spinner = createSpinner('Downloading...');
      let packed: string | undefined;
      let detail = '';
      const watcher = await watchProgress(fetch, event => {
        if (event.type === 'log') return;
        if (event.type === 'finish') packed = '100%';
        else if (event.type === 'progress' && event.total)
          packed = `${Math.floor(((event.finished ?? 0) / event.total) * 100)}%`;
        detail = event.type === 'finish' ? '' : event.message;
      });
      try {
        const params = new URLSearchParams({
          caseIds: batch.join(','),
          labelPackType: options.combined ? 'combined' : 'isolated',
          mhdLineEnding: options.crlf ? 'crlf' : 'lf',
          compressionFormat: options.zip ? 'zip' : 'tgz',
          ...(options.fullOriginalVolume ? { fullOriginalVolume: '1' } : {}),
          ...(watcher.progressId ? { progressId: watcher.progressId } : {})
        } satisfies CaseExportMhdQuery);
        const res = await fetch(`cases/export-mhd?${params}`);
        await downloadToFile(res, downloadPath, {
          spinner,
          label: size =>
            packed
              ? `Packed: ${packed}, received: ${size}` +
                (detail ? ` | ${detail}` : '')
              : undefined
        });
        // Link the completed archive into place without replacing a file.
        await fs.link(downloadPath, outputPath);
      } catch (err) {
        spinner.stop('Download failed', true);
        if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
          throw new Error(
            `Output archive already exists: ${outputPath}. Choose another output directory with --outdir.`,
            { cause: err }
          );
        }
        if (!options.skipOnError) throw err;
        failed++;
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`Failed to export case ${batch[0]}: ${reason}`);
        continue;
      } finally {
        watcher.stop();
        try {
          await fs.rm(stagingDir, { recursive: true, force: true });
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err);
          console.warn(
            `Warning: could not remove temporary directory ${stagingDir}: ${reason}`
          );
        }
      }
      spinner.stop('Download complete.');
    }
    if (options.skipOnError) {
      console.log(`Exported ${ids.length - failed} case(s), ${failed} failed.`);
      if (failed) process.exitCode = 1;
    }
  };
};

export default action;
