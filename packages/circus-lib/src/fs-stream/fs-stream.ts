import { Readable, Writable } from 'stream';
import tar from 'tar-stream';
import path from 'path';
import fs from 'fs-extra';
import recursive from 'recursive-readdir';

/**
 * Transports the contents of the specified directory
 * using a single tar-stream.
 * @param srcPath The path of the source directory.
 * @param destStream  The destination writable stream.
 * @returns A promise that resolves when all contents were put to the stream.
 */
export const putDirToWritableStream: (
  srcPath: string,
  destStream: Writable
) => Promise<void> = async (srcPath, destStream) => {
  const resolvedSrcPath = path.resolve(srcPath);
  return (async () => {
    const tarStream = tar.pack();
    tarStream.pipe(destStream);
    const putNext = (name: string, size: number, file: string) => {
      return new Promise((resolve, reject) => {
        const entry = tarStream.entry({ name, size }, err => {
          if (err) reject(err);
          else resolve(); // one file output to stream
        });
        fs.createReadStream(file).pipe(entry);
      });
    };
    const files = await recursive(resolvedSrcPath);
    for (const file of files) {
      const name = path.relative(resolvedSrcPath, file);
      const size = (await fs.stat(file)).size;
      await putNext(name, size, file);
    }
    tarStream.finalize();
  })();
};

/**
 * Loads the specified stream and restores the directory structure
 * into the specified path.
 * @param srcStream The stream written by `putDirToWritableStream`.
 * @param destPath The destination directory. Must exist.
 */
export const extractDirFromReadableStream: (
  srcStream: Readable,
  destPath: string
) => Promise<void> = async (srcStream, destPath) => {
  return new Promise(async (resolve, reject) => {
    const tarStream = tar.extract();
    const stat = await fs.stat(destPath);
    if (!stat.isDirectory()) {
      throw new Error('The destPath must be a directory.');
    }
    srcStream.pipe(tarStream);
    tarStream.on(
      'entry',
      async (header: tar.Headers, stream: Readable, next: () => any) => {
        const file = path.join(destPath, header.name);
        await fs.ensureDir(path.dirname(file));
        const outStream = fs.createWriteStream(file);
        stream.pipe(outStream);
        outStream.on('close', next);
      }
    );
    tarStream.on('finish', () => {
      resolve();
    });
  });
};
