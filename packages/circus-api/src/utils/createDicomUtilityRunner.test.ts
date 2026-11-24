import assert from 'node:assert/strict';
import { test } from 'node:test';
import createDicomUtilityRunner from './createDicomUtilityRunner.ts';
import fs from 'node:fs/promises';
import path from 'path';
import parser from 'dicom-parser';

const testDir = path.join(import.meta.dirname, '../../test/dicom');
const dockerImage = 'circuscad/dicom_utility:2.0.0-beta3';

test('compresses DICOM files using the lossless transfer syntax', async () => {
  const inBuffer = await fs.readFile(
    path.join(testDir, 'CT-MONO2-16-brain.dcm')
  );
  const runner = await createDicomUtilityRunner({
    maxConcurrency: 3,
    dockerImage
  });
  const outBuffers = await Promise.all([
    runner.compress(inBuffer.buffer as ArrayBuffer),
    runner.compress(inBuffer.buffer as ArrayBuffer),
    runner.compress(inBuffer.buffer as ArrayBuffer)
  ]);
  await runner.dispose();
  for (const outBuffer of outBuffers) {
    const dataSet = parser.parseDicom(new Uint8Array(outBuffer));
    assert.equal(dataSet.string('x00020010'), '1.2.840.10008.1.2.4.70');
  }
});

test('reuses a container for the next file', async () => {
  const inBuffer = await fs.readFile(
    path.join(testDir, 'CT-MONO2-16-brain.dcm')
  );
  const runner = await createDicomUtilityRunner({
    maxConcurrency: 1,
    dockerImage
  });
  try {
    for (let i = 0; i < 3; i++) {
      const outBuffer = await runner.compress(inBuffer.buffer as ArrayBuffer);
      const dataSet = parser.parseDicom(new Uint8Array(outBuffer));
      assert.equal(dataSet.string('x00020010'), '1.2.840.10008.1.2.4.70');
    }
  } finally {
    await runner.dispose();
  }
});

test('rejects an invalid Docker image', async () => {
  const inBuffer = await fs.readFile(
    path.join(testDir, 'CT-MONO2-16-brain.dcm')
  );
  const runner = await createDicomUtilityRunner({
    maxConcurrency: 3,
    dockerImage: 'circuscad/this-image-does-not-exist'
  });
  await assert.rejects(runner.compress(inBuffer.buffer as ArrayBuffer), {
    message: /Unable to find image/
  });
  await runner.dispose();
});

test('rejects malformed DICOM input', async () => {
  const inBuffer = Buffer.from('abcde'.repeat(1024), 'utf8');
  const runner = await createDicomUtilityRunner({
    maxConcurrency: 3,
    dockerImage
  });
  await assert.rejects(runner.compress(inBuffer.buffer as ArrayBuffer), {
    message: /Did not respond with "OK"|Dcm/
  });
  await runner.dispose();
});
