import assert from 'node:assert/strict';
import { test } from 'node:test';
import isLikeDicom from './isLikeDicom.ts';
import path from 'path';
import fs from 'fs-extra';

const testDir = path.join(import.meta.dirname, '../../test/dicom');

test('is dicom', async () => {
  const file = await fs.readFile(path.join(testDir, 'CT-MONO2-16-brain.dcm'));
  assert.equal(isLikeDicom(file.buffer as ArrayBuffer), true);
});

test('is not dicom', async () => {
  const file = await fs.readFile(path.join(testDir, 'test.zip'));
  assert.equal(isLikeDicom(file.buffer as ArrayBuffer), false);
});
