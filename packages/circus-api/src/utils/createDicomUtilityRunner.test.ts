import createDicomUtilityRunner from './createDicomUtilityRunner';
import fs from 'fs-extra';
import path from 'path';
import parser from 'dicom-parser';

const testDir = path.join(__dirname, '../../test/dicom');
const dockerImage = 'circuscad/dicom_utility:2.0.0-beta3';

test('compress DICOM file', async () => {
  const inBuffer = await fs.readFile(
    path.join(testDir, 'CT-MONO2-16-brain.dcm')
  );
  const runner = await createDicomUtilityRunner({
    maxConcurrency: 3,
    dockerImage
  });
  const outBuffers = await Promise.all([
    runner.compress(inBuffer.buffer),
    runner.compress(inBuffer.buffer),
    runner.compress(inBuffer.buffer)
  ]);
  await runner.dispose();
  for (const outBuffer of outBuffers) {
    const dataSet = parser.parseDicom(new Uint8Array(outBuffer));
    expect(dataSet.string('x00020010')).toBe('1.2.840.10008.1.2.4.70');
  }
});

test('reject if Docker image is invalid', async () => {
  const inBuffer = await fs.readFile(
    path.join(testDir, 'CT-MONO2-16-brain.dcm')
  );
  const runner = await createDicomUtilityRunner({
    maxConcurrency: 3,
    dockerImage: 'circuscad/this-image-does-not-exist'
  });
  await expect(runner.compress(inBuffer.buffer)).rejects.toThrow(
    /Unable to find image/
  );
  await runner.dispose();
});

test('rejects with broken DICOM file', async () => {
  const inBuffer = Buffer.from('abcde'.repeat(1024), 'utf8');
  const runner = await createDicomUtilityRunner({
    maxConcurrency: 3,
    dockerImage
  });
  await expect(runner.compress(inBuffer.buffer)).rejects.toThrow(
    /Did not respond with "OK"|Dcm/
  );
  await runner.dispose();
});
