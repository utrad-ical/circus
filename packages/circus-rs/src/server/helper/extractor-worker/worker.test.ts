import createDicomExtractorWorker from './createDicomExtractorWorker';
import fs from 'fs-extra';
import path from 'path';
import zlib from 'zlib';

const testdir = path.join(__dirname, '../../../../test-data/dicom/');

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
  const extract = await createDicomExtractorWorker({ maxConcurrency: 1 }, {});
  const data = await extract((await dicomImage()).buffer);
  expect(data).toHaveProperty('metadata');
  expect(data).toHaveProperty('pixelData');
  const dummy = new Uint8Array(512).fill(5).buffer;
  expect(extract(dummy)).rejects.toThrow(/DICM prefix not found/);
  await extract.dispose();
});
