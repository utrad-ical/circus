import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import progress from 'progress-stream';
import { Spinner } from './createSpinner.js';

/**
 * Converts a WHATWG ReadableStream to a Node's readable stream.
 * @param input - The input stream.
 * @returns The output stream.
 */
export const toReadable = (input: ReadableStream): Readable => {
  const reader = input.getReader();
  const rs = new Readable();
  rs._read = async () => {
    const result = await reader.read();
    if (!result.done) {
      rs.push(Buffer.from(result.value));
    } else {
      rs.push(null);
      return;
    }
  };
  return rs;
};

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
  const stream = toReadable(res.body!);
  const progressStream = progress({ length, time: 100 });
  const out = createWriteStream(file);

  progressStream.on('progress', progress => {
    spinner?.tick('Downloading: ' + Math.round(progress.percentage) + '%');
  });

  stream.pipe(progressStream).pipe(out);
  return new Promise<void>((resolve, reject) => {
    out.on('finish', () => {
      spinner?.tick('Download complete.');
      resolve();
    });
    out.on('error', err => {
      spinner?.stop('Download failed.', true);
      reject(err);
    });
  });
};

export default downloadToFile;
