import * as fs from 'node:fs/promises';
import { PassThrough, Readable, Writable } from 'node:stream';
import * as tar from 'tar';

/**
 * Pack a directory into a tar stream.
 * Returns a web-compatible ReadableStream.
 */
export const packDirToTar = async (dir: string) => {
  const files = await fs.readdir(dir);
  const ts = tar.create({ cwd: dir }, files);
  const pt = new PassThrough();
  ts.pipe(pt);
  return Readable.toWeb(pt) as ReadableStream<Uint8Array>;
};

/**
 * Extract a tar stream into a directory.
 * The input tar stream is a web-compatible ReadableStream.
 */
export const extractTarToDir = async (
  tarStream: ReadableStream<Uint8Array>,
  dir: string
) => {
  const pt = new PassThrough();
  const ts = tar.extract({ cwd: dir });
  pt.pipe(ts);
  const wts = Writable.toWeb(pt);
  await tarStream.pipeTo(wts);
};
