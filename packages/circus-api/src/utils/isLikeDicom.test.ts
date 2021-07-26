import isLikeDicom from './isLikeDicom';
import path from 'path';
import fs from 'fs-extra';

const testDir = path.join(__dirname, '../../test/dicom');

test('is dicom', async () => {
  const file = await fs.readFile(path.join(testDir, 'CT-MONO2-16-brain.dcm'));
  expect(isLikeDicom(file.buffer)).toBe(true);
});

test('is not dicom', async () => {
  const file = await fs.readFile(path.join(testDir, 'test.zip'));
  expect(isLikeDicom(file.buffer)).toBe(false);
});
