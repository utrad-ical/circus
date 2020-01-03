import path from 'path';
import fs from 'fs-extra';
import zipIterator from './zipIterator';

/**
 * Recursively iterate over a specified directory
 * and extract contents of the files that match a criterion.
 * Supports archive files.
 */
export default async function* directoryIterator(
  rootPath: string,
  pattern: RegExp = /./
): AsyncGenerator<ArrayBuffer> {
  const entries = await fs.readdir(rootPath);
  for (const fileName of entries) {
    const entryPath = path.join(rootPath, fileName);
    const stat = await fs.stat(entryPath);
    if (stat.isDirectory()) {
      yield* directoryIterator(entryPath, pattern);
    } else if (stat.isFile()) {
      if (entryPath.match(pattern)) {
        const buf = await fs.readFile(entryPath);
        yield buf.buffer as ArrayBuffer;
      } else if (/\.zip$/i.test(entryPath)) {
        const zipBuf = await fs.readFile(entryPath);
        yield* zipIterator(zipBuf, pattern);
      }
    }
  }
}
