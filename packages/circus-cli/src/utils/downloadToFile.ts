import { createWriteStream } from 'node:fs';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Spinner } from './createSpinner.ts';

interface DownloadOptions {
  spinner?: Spinner;
  /** Returns the text to show with the received size, if any */
  label?: (size: string) => string | undefined;
}

const downloadToFile = async (
  res: Response,
  file: string,
  options: DownloadOptions = {}
) => {
  const { spinner, label } = options;
  const length = Number(res.headers.get('Content-Length')) || undefined;

  let received = 0;
  let lastUpdate = 0;
  const progress = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      received += chunk.length;
      const now = Date.now();
      if (now - lastUpdate >= 100) {
        lastUpdate = now;
        const size = length
          ? Math.round((received / length) * 100) + '%'
          : Math.round(received / 1024) + ' KiB';
        spinner?.update(label?.(size) ?? `Downloading: ${size}`);
      }
      callback(null, chunk);
    }
  });

  try {
    await pipeline(
      Readable.fromWeb(res.body!),
      progress,
      createWriteStream(file)
    );
    spinner?.update('Download complete.');
  } catch (err) {
    spinner?.stop('Download failed.', true);
    throw err;
  }
};

export default downloadToFile;
