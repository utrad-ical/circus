import { Unzip, UnzipInflate } from 'fflate';
import { createTarDecoder } from 'modern-tar';

export interface ArchiveEntry {
  /** e.g. `archive.zip/dir/a.dcm`, or the file name itself */
  name: string;
  /** Reads the whole content; rejects if it exceeds `maxEntryBytes` */
  bytes: () => Promise<Uint8Array>;
}

/**
 * Reads the entire stream, or rejects when it exceeds `max` bytes.
 */
const readAll = async (stream: ReadableStream<Uint8Array>, max: number) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) {
      await reader.cancel();
      throw new Error(`The file exceeds the size limit (${max} bytes).`);
    }
    chunks.push(value);
  }
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
};

/**
 * Reads the first `n` bytes (or fewer at the end), and returns them
 * along with a stream that still yields the whole content.
 */
const peek = async (stream: ReadableStream<Uint8Array>, n: number) => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (length < n) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    length += value.byteLength;
  }
  const head = new Uint8Array(length);
  chunks.reduce((offset, c) => (head.set(c, offset), offset + c.byteLength), 0);
  const whole = new ReadableStream<Uint8Array>({
    start: controller => {
      if (length) controller.enqueue(head);
    },
    pull: async controller => {
      const { done, value } = await reader.read();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel: reason => reader.cancel(reason)
  });
  return { head, whole };
};

const isZip = (head: Uint8Array) =>
  head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;

const isGzip = (head: Uint8Array) => head[0] === 0x1f && head[1] === 0x8b;

const concat = (chunks: Uint8Array[], length: number) => {
  const result = new Uint8Array(length);
  chunks.reduce((offset, c) => (result.set(c, offset), offset + c.length), 0);
  return result;
};

// The record (22 bytes) and a comment of up to 65535 bytes
const maxEndOfDirectoryLength = 22 + 65535;

const hasEndOfDirectory = (tail: Uint8Array) => {
  for (let i = tail.length - 22; i >= 0; i--) {
    if (
      tail[i] === 0x50 &&
      tail[i + 1] === 0x4b &&
      tail[i + 2] === 0x05 &&
      tail[i + 3] === 0x06
    )
      return true;
  }
  return false;
};

// fflate cannot tell where such an entry ends
const unreadableZipMessage =
  'This zip file cannot be read while uploading. ' +
  'Create it again as a tar.gz file or a compressed zip file.';

/**
 * Reads a zip file from the beginning, using its local headers.
 * Each entry is buffered, which is fine for DICOM files.
 */
async function* zipEntries(
  stream: ReadableStream<Uint8Array>,
  name: string,
  maxEntryBytes: number
): AsyncGenerator<ArchiveEntry> {
  type Result = { name: string; data?: Uint8Array; error?: string };
  const results: Result[] = [];
  let fatal: string | undefined;
  const unzip = new Unzip(file => {
    if (file.name.endsWith('/')) return; // directory
    const entryName = `${name}/${file.name}`;
    // Stored, and the size comes after the data
    if (file.compression === 0 && file.size === undefined) {
      fatal ??= unreadableZipMessage;
      return;
    }
    let chunks: Uint8Array[] = [];
    let length = 0;
    file.ondata = (err, chunk, final) => {
      if (err) {
        results.push({ name: entryName, error: err.message });
        return;
      }
      length += chunk.length;
      if (length <= maxEntryBytes) chunks.push(chunk);
      else chunks = [];
      if (!final) return;
      results.push(
        length > maxEntryBytes
          ? {
              name: entryName,
              error: `The file exceeds the size limit (${maxEntryBytes} bytes).`
            }
          : { name: entryName, data: concat(chunks, length) }
      );
    };
    try {
      file.start();
    } catch (err: any) {
      results.push({ name: entryName, error: err.message });
    }
  });
  unzip.register(UnzipInflate);

  // fflate silently ignores a zip file cut in a header,
  // so check that the end of central directory record exists
  let tail = new Uint8Array(0);
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (value) tail = concat([tail, value], tail.length + value.length);
      tail = tail.subarray(-maxEndOfDirectoryLength);
      unzip.push(value ?? new Uint8Array(0), done);
      if (fatal) throw new Error(fatal);
      if (done && !hasEndOfDirectory(tail))
        throw new Error('The zip file is incomplete.');
      while (results.length) {
        const { name, data, error } = results.shift()!;
        yield {
          name,
          bytes: async () => {
            if (error) throw new Error(error);
            return data!;
          }
        };
      }
      if (done) return;
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

async function* tarEntries(
  stream: ReadableStream<Uint8Array>,
  name: string,
  maxEntryBytes: number
): AsyncGenerator<ArchiveEntry> {
  const entries = stream
    .pipeThrough(
      new DecompressionStream('gzip') as TransformStream<Uint8Array, Uint8Array>
    )
    .pipeThrough(createTarDecoder());
  const reader = entries.getReader();
  try {
    while (true) {
      const { done, value: entry } = await reader.read();
      if (done) return;
      if (entry.header.type !== 'file') {
        await entry.body.cancel();
        continue;
      }
      let read = false;
      yield {
        name: `${name}/${entry.header.name}`,
        bytes: () => {
          read = true;
          return readAll(entry.body, maxEntryBytes);
        }
      };
      if (!read) await entry.body.cancel();
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

/**
 * Iterates the files in an uploaded file, which may be a zip or tar.gz
 * archive, from the beginning of the stream.
 * Each entry must be read (or skipped) before the next one.
 * Throws if the archive itself is broken.
 */
export default async function* archiveEntries(
  stream: ReadableStream<Uint8Array>,
  name: string,
  options: { maxEntryBytes: number }
): AsyncGenerator<ArchiveEntry> {
  const { maxEntryBytes } = options;
  const { head, whole } = await peek(stream, 4);
  if (isZip(head)) {
    yield* zipEntries(whole, name, maxEntryBytes);
  } else if (isGzip(head)) {
    yield* tarEntries(whole, name, maxEntryBytes);
  } else {
    let read = false;
    yield {
      name,
      bytes: () => {
        read = true;
        return readAll(whole, maxEntryBytes);
      }
    };
    if (!read) await whole.cancel();
  }
}
