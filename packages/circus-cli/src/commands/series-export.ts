import * as path from 'node:path';
import createSpinner from '../utils/createSpinner.ts';
import downloadToFile from '../utils/downloadToFile.ts';
import {
  editSeriesList,
  fetchSeries,
  formatRange,
  parseSeriesSpec,
  type SelectedSeries
} from '../utils/seriesSelector.ts';
import watchProgress from '../utils/watchProgress.ts';
import type { CommandAction } from './CommandAction.ts';

const maxSeries = 10;

const action: CommandAction = ({ getFetch }) => {
  return async (args: string[], options) => {
    const fetch = getFetch();
    let series: SelectedSeries[] | undefined = [];
    if (args.length) {
      if (args.length > maxSeries)
        throw new Error(`Up to ${maxSeries} series can be downloaded.`);
      for (const arg of args) {
        const { seriesUid, range } = parseSeriesSpec(arg);
        series.push(await fetchSeries(fetch, seriesUid, range));
      }
    } else {
      if (!process.stdin.isTTY) throw new Error('Specify the series.');
      series = await editSeriesList(fetch, [], {
        submitLabel: 'Start download',
        max: maxSeries
      });
      if (!series) {
        console.log('Canceled.');
        return;
      }
    }

    const ext = options.zip ? '.zip' : '.tar.gz';
    const file = options.out ?? path.resolve(series[0].seriesUid + ext);
    const spinner = createSpinner('Downloading...');
    let detail = '';
    const watcher = await watchProgress(fetch, event => {
      if (event.type === 'progress' && event.total)
        detail = `Volume ${(event.finished ?? 0) + 1}/${event.total}`;
    });
    try {
      const params = new URLSearchParams({
        series: series
          .map(s => `${s.seriesUid}:${formatRange(s.range)}`)
          .join(','),
        compressionFormat: options.zip ? 'zip' : 'tgz'
      });
      if (watcher.progressId) params.set('progressId', watcher.progressId);
      const res = await fetch(`series/export-cs-volume?${params}`);
      await downloadToFile(res, file, {
        spinner,
        label: size => `Received: ${size}` + (detail ? ` | ${detail}` : '')
      });
    } catch (err: any) {
      spinner.stop('Download failed.', true);
      throw err;
    } finally {
      watcher.stop();
    }
    spinner.stop(`Saved ${file}`);
  };
};

export default action;
