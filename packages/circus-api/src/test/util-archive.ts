import { Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import { unpackTar } from 'modern-tar';
import type { ArchiveFormat } from '../utils/createArchiveWriter.ts';

/**
 * Reads an archive into a map of file names to their contents.
 */
export const readArchive = async (
  format: ArchiveFormat,
  data: ReadableStream<Uint8Array>
) => {
  const files = new Map<string, Uint8Array>();
  if (format === 'zip') {
    const reader = new ZipReader(data, { useWebWorkers: false });
    for (const entry of await reader.getEntries())
      if (!entry.directory)
        files.set(entry.filename, await entry.getData(new Uint8ArrayWriter()));
    await reader.close();
  } else {
    const entries = await unpackTar(
      data.pipeThrough(
        new DecompressionStream('gzip') as TransformStream<
          Uint8Array,
          Uint8Array
        >
      )
    );
    for (const { header, data } of entries) files.set(header.name, data!);
  }
  return files;
};
