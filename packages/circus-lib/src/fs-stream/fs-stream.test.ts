import {
  putDirToWritableStream,
  extractDirFromReadableStream
} from './fs-stream';
import { PassThrough } from 'stream';
import path from 'path';
import fs from 'fs-extra';

const testRoot = path.join(__dirname, '..', '..', 'testdata');
const srcDir = path.join(testRoot, 'sample-dicom');
const destDir = path.join(testRoot, 'dest');

describe('fs-stream', () => {
  test('putDirToWritableStream', async done => {
    await fs.ensureDir(destDir);
    const pt = new PassThrough();
    putDirToWritableStream(srcDir, pt);
    extractDirFromReadableStream(pt, destDir);
    pt.on('finish', async () => {
      await fs.remove(destDir);
      done();
    });
  });
});
