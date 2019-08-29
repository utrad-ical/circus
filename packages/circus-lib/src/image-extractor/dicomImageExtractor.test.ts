import dicomImageExtractor from './dicomImageExtractor';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import * as px from '../PixelFormat';
import { PNG } from 'pngjs';

const testdir = path.join(__dirname, '../../testdata/test-dicom/');

interface CheckObject {
  [key: string]: any;
}

describe('dicomImageExtractor', () => {
  const exec = (file: string, content: Buffer, checks: CheckObject) => {
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
    const png = new PNG({ width: metadata.columns, height: metadata.rows });
    const useWindow = metadata.window || {
      level: (metadata.minValue! + metadata.maxValue!) / 2,
      width: metadata.maxValue! - metadata.minValue!
    };
    const ww = useWindow.width;
    const wl = useWindow.level;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const index = x + y * png.width;
        const byteIndex = index * 4;
        let pixel = readArray[index];
        if (doRescale) {
          pixel = pixel * metadata.rescale.slope + metadata.rescale.intercept;
        }
        const col = Math.max(
          0,
          Math.min(255, Math.round((pixel - wl + ww / 2) * (255 / ww)))
        );
        png.data[byteIndex] = col;
        png.data[byteIndex + 1] = col;
        png.data[byteIndex + 2] = col;
        png.data[byteIndex + 3] = 0xff;
      }
    }
    const outFile = path.join(testdir, `${file}.png`);
    return new Promise(resolve => {
      png
        .pack()
        .pipe(fs.createWriteStream(outFile))
        .on('finish', resolve);
    });
  };

  const testFile = (file: string, checks: CheckObject) => {
    const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
    return new Promise((resolve, reject) => {
      zlib.unzip(zippedFileContent, (err, fileContent) => {
        if (err) throw reject();
        exec(file, fileContent, checks)
          .then(resolve)
          .catch(reject);
      });
    });
  };

  test('CT-MONO2-16-brain', () => {
    return testFile('CT-MONO2-16-brain', {
      columns: 512,
      rows: 512,
      pixelSpacing: [0.46875, 0.46875]
    });
  });

  test('CT-phantom-lossless', () => {
    return testFile('CT-phantom-lossless', {
      columns: 512,
      rows: 512,
      pixelSpacing: [0.683594, 0.683594]
    });
  });

  test('MR-MONO2-16-head', () => {
    return testFile('MR-MONO2-16-head', {
      columns: 256,
      rows: 256,
      pixelSpacing: [0.859375, 0.859375]
    });
  });

  test.skip('DX-MONO2-16-chest', () => {
    return testFile('DX-MONO2-16-chest', {
      columns: 2022,
      rows: 2022,
      window: { level: 8192, width: 16383 }
    });
  });

  test('MR-phantom-LI', () => {
    return testFile('MR-phantom-LI', {
      columns: 256,
      rows: 256,
      pixelSpacing: [1.5625, 1.5625]
    });
  });

  test('MR-phantom-LE', () => {
    return testFile('MR-phantom-LE', {
      columns: 256,
      rows: 256,
      pixelSpacing: [1.5625, 1.5625]
    });
  });

  test('MR-phantom-lossless', () => {
    return testFile('MR-phantom-lossless', {
      columns: 256,
      rows: 256,
      pixelSpacing: [1.5625, 1.5625]
    });
  });
});
