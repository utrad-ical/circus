import { Uint8ArrayReader, ZipWriter } from '@zip.js/zip.js';
import { createTarPacker } from 'modern-tar';

export type ArchiveFormat = 'zip' | 'tgz';

/**
 * Writes files into a zip or tar.gz archive as a stream.
 * Call `add` one at a time; each call waits until the reader of
 * `readable` consumes the data.
 */
export interface ArchiveWriter {
  readable: ReadableStream<Uint8Array>;
  /**
   * Adds a file. `size` is required for a stream in tar.gz.
   */
  add: (
    name: string,
    data: string | Uint8Array | ReadableStream<Uint8Array>,
    size?: number
  ) => Promise<void>;
  close: () => Promise<void>;
  /** Makes `readable` fail, so that the reader sees a broken archive */
  abort: (reason: unknown) => void;
}

const toBytes = (data: string | Uint8Array) =>
  typeof data === 'string' ? new TextEncoder().encode(data) : data;

const createZipWriter = (): ArchiveWriter => {
  let controller: TransformStreamDefaultController<Uint8Array>;
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>({
    start: c => {
      controller = c;
    }
  });
  const zipWriter = new ZipWriter(writable, { useWebWorkers: false });
  return {
    readable,
    add: async (name, data, size) => {
      if (data instanceof ReadableStream) {
        await zipWriter.add(name, data, { uncompressedSize: size });
      } else {
        await zipWriter.add(name, new Uint8ArrayReader(toBytes(data)));
      }
    },
    close: async () => {
      await zipWriter.close();
    },
    abort: reason => controller.error(reason)
  };
};

const createTgzWriter = (): ArchiveWriter => {
  const { readable, controller } = createTarPacker();
  return {
    readable: readable.pipeThrough(new CompressionStream('gzip')),
    add: async (name, data, size) => {
      const bytes = data instanceof ReadableStream ? undefined : toBytes(data);
      const entrySize = bytes ? bytes.byteLength : size;
      if (entrySize === undefined) throw new TypeError('Size is required.');
      const entry = controller.add({
        name,
        size: entrySize,
        type: 'file',
        mode: 0o644,
        mtime: new Date()
      });
      if (bytes) {
        const writer = entry.getWriter();
        await writer.write(bytes);
        await writer.close();
      } else {
        await (data as ReadableStream<Uint8Array>).pipeTo(entry);
      }
    },
    close: async () => controller.finalize(),
    abort: reason => controller.error(reason)
  };
};

const createArchiveWriter = (format: ArchiveFormat): ArchiveWriter =>
  format === 'zip' ? createZipWriter() : createTgzWriter();

export default createArchiveWriter;
