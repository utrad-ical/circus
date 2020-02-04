import * as JSZip from 'jszip';

/**
 * Asynchronous iterator that extracts files from a zip file.
 * @param zipBuf The buffer that holds the content a zip file.
 */
export default async function* zipIterator(zipBuf: Buffer, pattern: RegExp) {
  const archive = await JSZip.loadAsync(zipBuf);
  const entries = archive.file(pattern); // all files, including subdirs
  for (const entry of entries) {
    // We use the *copy* of the returned buffer
    // because `async('arraybuffer') instanceof ArrayBuffer` somehow
    // evaluates to false
    const buffer = Buffer.from(await entry.async('nodebuffer')).buffer;
    yield buffer;
  }
}
