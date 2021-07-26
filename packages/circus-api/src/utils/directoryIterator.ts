import path from 'path';
import fs from 'fs-extra';
import {
  isLikeTargz,
  isLikeZip,
  zipIterator,
  targzIterator
} from './archiveIterator';

type Entry =
  | {
      type: 'fs' | 'zip' | 'targz';
      name: string;
      buffer: ArrayBuffer;
      archiveName?: string; // Applicable only when file is archive
    }
  | {
      type: 'error';
      message: string;
    };

export async function* fileOrArchiveIterator(
  buffer: ArrayBuffer,
  filePath: string
): AsyncGenerator<Entry> {
  if (isLikeZip(buffer)) {
    for await (const entry of zipIterator(buffer, /./)) {
      yield {
        type: 'zip',
        name: entry.name,
        buffer: entry.buffer,
        archiveName: filePath
      };
    }
  } else if (isLikeTargz(buffer)) {
    for await (const entry of targzIterator(buffer)) {
      yield {
        type: 'targz',
        name: entry.name,
        buffer: entry.buffer,
        archiveName: filePath
      };
    }
  } else {
    yield {
      type: 'fs',
      name: filePath,
      buffer
    };
  }
}

/**
 * Extract contents of all the files specified by the given path.
 * @param rootPath The path to a file or a directory.
 * If the path refers to a regular file, returns its content as an ArrayBuffer.
 * If the path refers to a directory, recursively iterates the belonging files.
 * If the path refers to a zip archive, recursively iterates its member files.
 */
export default async function* directoryIterator(
  rootPath: string
): AsyncGenerator<Entry> {
  const stat = await fs.stat(rootPath);
  if (stat.isDirectory()) {
    const entries = await fs.readdir(rootPath);
    for (const entry of entries) {
      const targetPath = path.join(rootPath, entry);
      yield* directoryIterator(targetPath);
    }
  } else if (stat.isFile()) {
    const buffer = await fs.readFile(rootPath);
    try {
      yield* fileOrArchiveIterator(buffer.buffer, rootPath);
    } catch (err) {
      yield { type: 'error', message: `File ${rootPath} is invalid.` };
    }
  }
}
