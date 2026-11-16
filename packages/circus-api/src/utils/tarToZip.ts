import { createTarDecoder } from 'modern-tar';
import createArchiveWriter from './createArchiveWriter.ts';

/**
 * Converts an uncompressed tar stream into a zip stream, entry by entry.
 * Entries other than files are dropped.
 */
const tarToZip = (
  tar: ReadableStream<Uint8Array>
): ReadableStream<Uint8Array> => {
  const writer = createArchiveWriter('zip');
  const reader = tar.pipeThrough(createTarDecoder()).getReader();
  (async () => {
    try {
      while (true) {
        const { done, value: entry } = await reader.read();
        if (done) break;
        if (entry.header.type === 'file')
          await writer.add(entry.header.name, entry.body, entry.header.size);
        else await entry.body.cancel();
      }
      await writer.close();
    } catch (err) {
      writer.abort(err);
      await reader.cancel(err).catch(() => {});
    }
  })();
  return writer.readable;
};

export default tarToZip;
