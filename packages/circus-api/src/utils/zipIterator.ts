import * as JSZip from 'jszip';

/**
 * Checks if the given buffer has a ZIP signature.
 * @param buffer The content of a file which may nor may not be a zip.
 */
export const isLikeZip = (buffer: ArrayBuffer) => {
  if (buffer.byteLength < 4) return false;
  const signature = new DataView(buffer).getUint32(0);
  return [0x504b0304, 0x504b0708].some(s => s === signature);
};

/**
 * Asynchronous iterator that extracts files from a zip file.
 * @param zipBuf The buffer that holds the content a zip file.
 */
export default async function* zipIterator(
  zipBuf: ArrayBuffer,
  pattern: RegExp
) {
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
}
