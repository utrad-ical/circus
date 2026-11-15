import { Busboy, type BusboyHeaders } from '@fastify/busboy';
import type { IncomingMessage } from 'node:http';
import type { Readable } from 'node:stream';

export interface UploadedFile {
  /** The file name sent by the client, including its relative path */
  filename: string;
  stream: ReadableStream<Uint8Array>;
}

/**
 * Wraps a busboy file stream. Canceling it drains the rest
 * instead of destroying it, so that busboy can move on to the next part.
 */
const toWebStream = (file: Readable) => {
  let canceled = false;
  return new ReadableStream<Uint8Array>(
    {
      start: controller => {
        file.on('data', (chunk: Buffer) => {
          if (canceled) return;
          controller.enqueue(new Uint8Array(chunk));
          if ((controller.desiredSize ?? 0) <= 0) file.pause();
        });
        file.on('end', () => !canceled && controller.close());
        file.on('error', err => !canceled && controller.error(err));
        file.pause();
      },
      pull: () => {
        file.resume();
      },
      cancel: () => {
        canceled = true;
        file.resume();
      }
    },
    { highWaterMark: 1 }
  );
};

/**
 * Reads the files in a multipart request one by one, while receiving it.
 * Each file must be read (or canceled) before the next one is received.
 * Fields other than files are ignored.
 */
export default async function* readMultipartFiles(
  req: IncomingMessage
): AsyncGenerator<UploadedFile> {
  const busboy = Busboy({
    headers: req.headers as BusboyHeaders,
    preservePath: true
  });
  type Item = { file: Readable; filename: string } | Error | null;
  const queue: Item[] = [];
  let wake: (() => void) | undefined;
  const push = (item: Item) => {
    queue.push(item);
    wake?.();
  };
  let current: Readable | undefined;

  busboy.on('file', (_field, file, filename) => push({ file, filename }));
  busboy.on('finish', () => push(null));
  busboy.on('error', err =>
    push(err instanceof Error ? err : new Error(String(err)))
  );
  req.on('close', () => {
    if (req.complete) return;
    const err = new Error('The upload was interrupted.');
    current?.destroy(err);
    push(err);
  });
  req.pipe(busboy);

  try {
    while (true) {
      if (!queue.length) await new Promise<void>(r => (wake = r));
      const item = queue.shift()!;
      if (item === null) return;
      if (item instanceof Error) throw item;
      const { file, filename } = item;
      current = file;
      const stream = toWebStream(file);
      yield { filename, stream };
      // Drain what the consumer left
      if (!file.readableEnded && !file.destroyed) {
        await new Promise<void>((resolve, reject) => {
          file.on('end', resolve);
          file.on('error', reject);
          file.removeAllListeners('data');
          file.resume();
        });
      }
    }
  } finally {
    req.unpipe(busboy);
    req.resume();
  }
}
