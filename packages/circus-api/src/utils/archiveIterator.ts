import * as JSZip from 'jszip';
import tar from 'tar-stream';
import zlib from 'zlib';
import rawBody from 'raw-body';
import { Readable, pipeline } from 'stream';
import { EventEmitter } from 'events';

/**
 * Checks if the given buffer has a ZIP signature.
 * @param buffer The content of a file which may nor may not be a zip.
 */
export const isLikeZip = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 4) return false;
  const signature = new DataView(buffer).getUint32(0);
  return [0x504b0304, 0x504b0708].some(s => s === signature);
};

export const isLikeTargz = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 4) return false;
  const signature = new DataView(buffer).getUint16(0);
  return 0x1f8b === signature; //1f8b tar.gz
};

type ArchiveIterator = AsyncGenerator<{ name: string; buffer: ArrayBuffer }>;

/**
 * Asynchronous iterator that extracts files from a zip file.
 * @param zipBuf The buffer that holds the content a zip file.
 */
export const zipIterator = async function* (
  zipBuf: ArrayBuffer,
  pattern: RegExp
): ArchiveIterator {
  const archive = await JSZip.loadAsync(zipBuf);
  const entries = archive.file(pattern); // all files, including subdirs
  for (const entry of entries) {
    // We use the *copy* of the returned buffer
    // because `async('arraybuffer') instanceof ArrayBuffer` somehow
    // evaluates to false
    const buffer = Buffer.from(await entry.async('nodebuffer'))
      .buffer as ArrayBuffer;
    yield { name: entry.name, buffer };
  }
};

export const targzIterator = async function* (
  buffer: ArrayBuffer
): ArchiveIterator {
  const gunzip = zlib.createGunzip();
  const extract = tar.extract();

  let lastStream: Readable | undefined = undefined;
  let lastName: string | undefined = undefined;
  let lastNext: Function | undefined = undefined;
  let error: Error | undefined = undefined;
  let finished = false;

  const signal = new EventEmitter();

  pipeline(gunzip, extract, err => {
    if (err) {
      error = err;
      signal.emit('next');
    }
  });
  gunzip.end(Buffer.from(buffer));

  extract.on('entry', (header, stream, next) => {
    lastStream = stream;
    lastName = header.name;
    lastNext = next;
    signal.emit('next');
  });
  extract.on('finish', () => {
    finished = true;
    signal.emit('next');
  });

  while (true) {
    if (!lastStream)
      await new Promise<void>(resolve => {
        signal.once('next', resolve);
      });
    if (error) throw error;
    if (finished) return;
    yield {
      name: lastName!,
      buffer: (await rawBody(lastStream!)).buffer
    };
    lastStream = undefined;
    lastNext!();
  }
};
