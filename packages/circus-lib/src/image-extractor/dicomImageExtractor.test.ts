import dicomImageExtractor from './dicomImageExtractor';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import * as px from '../PixelFormat';

const testdir = path.join(__dirname, '../../testdata/test-dicom/');

interface CheckObject {
  [key: string]: any;
}

describe('dicomImageExtractor', () => {
  const exec = async (file: string, content: Buffer, checks: CheckObject) => {
    const extract = dicomImageExtractor();
    const { metadata, pixelData } = extract(content.buffer as ArrayBuffer);

    if (!metadata || !pixelData) throw new Error();

    for (const key in checks) {
      expect(checks[key]).toEqual((metadata as any)[key]);
    }
    const pxInfo = px.pixelFormatInfo(metadata.pixelFormat);
    expect(metadata.columns * metadata.rows * pxInfo.bpp).toEqual(
      pixelData.byteLength
    );
    const readArray = new pxInfo.arrayClass(pixelData);

    const doRescale =
      metadata.rescale && typeof metadata.rescale.intercept === 'number';
    typeof metadata.rescale.slope === 'number';

    // write PNG image
    const arr = new Uint8ClampedArray(metadata.columns * metadata.rows);
    const useWindow = metadata.window
      ? metadata.window
      : {
          level: (metadata.minValue! + metadata.maxValue!) / 2,
          width: metadata.maxValue! - metadata.minValue!
        };
    const ww = useWindow.width;
    const wl = useWindow.level;
    for (let x = 0; x < metadata.columns; x++) {
      for (let y = 0; y < metadata.rows; y++) {
        let pixel = readArray[x + y * metadata.columns];
        if (doRescale) {
          pixel = pixel * metadata.rescale.slope + metadata.rescale.intercept;
        }
        const o = Math.round((pixel - wl + ww / 2) * (255 / ww));
        arr[x + y * metadata.columns] = o;
      }
    }
  };

  const testFile = (file: string, checks: CheckObject) => {
    it('must parse ' + file, async () => {
      // Test file can be either a raw DICOM file or a gzipped one
      const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
      zlib.unzip(zippedFileContent, async (err, fileContent) => {
        if (err) throw err;
        await exec(file, fileContent, checks);
      });
    });
  };

  testFile('CT-MONO2-16-brain', {
    columns: 512,
    rows: 512,
    pixelSpacing: [0.46875, 0.46875]
  });
  testFile('CT-phantom-lossless', {
    columns: 512,
    rows: 512,
    pixelSpacing: [0.683594, 0.683594]
  });
  testFile('MR-MONO2-16-head', {
    columns: 256,
    rows: 256,
    pixelSpacing: [0.859375, 0.859375]
  });
  testFile('DX-MONO2-16-chest', {
    columns: 2022,
    rows: 2022,
    window: { level: 8192, width: 16383 }
  });
  testFile('MR-phantom-LI', {
    columns: 256,
    rows: 256,
    pixelSpacing: [1.5625, 1.5625]
  });
  testFile('MR-phantom-LE', {
    columns: 256,
    rows: 256,
    pixelSpacing: [1.5625, 1.5625]
  });
  testFile('MR-phantom-lossless', {
    columns: 256,
    rows: 256,
    pixelSpacing: [1.5625, 1.5625]
  });
});
