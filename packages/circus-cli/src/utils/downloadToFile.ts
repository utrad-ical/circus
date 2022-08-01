import { Response } from 'node-fetch';
import { createWriteStream } from 'node:fs';
import progress from 'progress-stream';
import { Spinner } from './createSpinner.js';

interface DownloadOptions {
  spinner?: Spinner;
}

const downloadToFile = async (
  res: Response,
  file: string,
  options: DownloadOptions = {}
) => {
  const length: number | undefined =
    Number(res.headers.get('Content-Length')) ?? undefined;

  const spinner = options.spinner;
  const stream = res.body!;
  const progressStream = progress({ length, time: 100 });
  const out = createWriteStream(file);

  progressStream.on('progress', progress => {
    spinner?.update('Downloading: ' + Math.round(progress.percentage) + '%');
  });

  stream.pipe(progressStream).pipe(out);
  return new Promise<void>((resolve, reject) => {
    out.on('finish', () => {
      spinner?.update('Download complete.');
      resolve();
    });
    out.on('error', err => {
      spinner?.stop('Download failed.', true);
      reject(err);
    });
  });
};

export default downloadToFile;
