import assert from 'node:assert/strict';
import { test } from 'node:test';
import createDicomExtractorWorker from './createDicomExtractorWorker.ts';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';

const testdir = path.join(import.meta.dirname, '../../../../test-data/dicom/');

const dicomImage = (file = 'CT-MONO2-16-brain') => {
  return new Promise<Buffer>(resolve => {
    try {
      const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
      zlib.unzip(zippedFileContent, function (err, fileContent) {
        if (err) throw err;
        resolve(fileContent);
      });
    } catch (err) {
      const fileContent = fs.readFileSync(testdir + file);
      resolve(fileContent);
    }
  });
};

test('dicomExtractorWorker', async () => {
  const extract = await createDicomExtractorWorker({ maxConcurrency: 1 });
  const data = await extract((await dicomImage()).buffer);
  assert.ok('metadata' in data);
  assert.ok('pixelData' in data);
  const dummy = new Uint8Array(512).fill(5).buffer;
  await assert.rejects(extract(dummy), { message: /DICM prefix not found/ });
  await extract.dispose();
});

test('dicomExtractorWorker under node --watch', async () => {
  // With `node --watch`, Node sets this variable and the worker reports
  // every module it loads to the parent port
  process.env.WATCH_REPORT_DEPENDENCIES = '1';
  try {
    const extract = await createDicomExtractorWorker({ maxConcurrency: 1 });
    const data = await extract((await dicomImage()).buffer);
    assert.ok('metadata' in data);
    assert.ok('pixelData' in data);
    await extract.dispose();
  } finally {
    delete process.env.WATCH_REPORT_DEPENDENCIES;
  }
});
