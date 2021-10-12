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
      expect((metadata as any)[key]).toEqual(checks[key]);
    }
    const pxInfo = px.pixelFormatInfo(metadata.pixelFormat);
    expect(pixelData.byteLength).toEqual(
      metadata.columns * metadata.rows * pxInfo.bpp
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

    if (metadata.pixelFormat === 'rgba8') {
      // RGBA8888 Image
      const isLittleEndian = new Uint8Array(Uint16Array.of(1).buffer)[0] === 1;
      if (isLittleEndian) {
        // CASE: Little Endian
        for (let y = 0; y < png.height; y++) {
          for (let x = 0; x < png.width; x++) {
            const index = x + y * png.width;
            const byteIndex = index * 4;
            const pixel = readArray[index];
            const alpha = pixel >>> 24;
            const blue = (pixel << 8) >>> 24;
            const green = (pixel << 16) >>> 24;
            const red = (pixel << 24) >>> 24;
            png.data[byteIndex] = red;
            png.data[byteIndex + 1] = green;
            png.data[byteIndex + 2] = blue;
            png.data[byteIndex + 3] = alpha;
          }
        }
      } else {
        // CASE: Big Endian
        png.data = readArray;
      }
    } else {
      // Monochrome Image
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
    }

    const outFile = path.join(testdir, `${file}.png`);
    return new Promise(resolve => {
      png.pack().pipe(fs.createWriteStream(outFile)).on('finish', resolve);
    });
  };

  const testFile = (file: string, checks: CheckObject) => {
    const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
    return new Promise((resolve, reject) => {
      zlib.unzip(zippedFileContent, (err, fileContent) => {
        if (err) throw reject();
        exec(file, fileContent, checks).then(resolve).catch(reject);
      });
    });
  };

  test('CT-MONO2-16-brain', () => {
    return testFile('CT-MONO2-16-brain', {
      columns: 512,
      rows: 512,
      pixelSpacing: [0.46875, 0.46875],
      pixelFormat: 'int16',
      pixelDataCharacteristics: 'ORIGINAL'
    });
  });

  test('CT-phantom-lossless', () => {
    return testFile('CT-phantom-lossless', {
      columns: 512,
      rows: 512,
      pixelSpacing: [0.683594, 0.683594],
      pixelFormat: 'int16',
      pixelDataCharacteristics: 'ORIGINAL'
    });
  });

  test('MR-MONO2-16-head', () => {
    return testFile('MR-MONO2-16-head', {
      columns: 256,
      rows: 256,
      pixelSpacing: [0.859375, 0.859375],
      pixelFormat: 'int16',
      pixelDataCharacteristics: 'ORIGINAL'
    });
  });

  test.skip('DX-MONO2-16-chest', () => {
    return testFile('DX-MONO2-16-chest', {
      columns: 2022,
      rows: 2022,
      window: { level: 8192, width: 16383 },
      pixelFormat: 'int16',
      pixelDataCharacteristics: 'ORIGINAL'
    });
  });

  test('MR-phantom-LI', () => {
    return testFile('MR-phantom-LI', {
      columns: 256,
      rows: 256,
      pixelSpacing: [1.5625, 1.5625],
      pixelFormat: 'int16',
      pixelDataCharacteristics: 'ORIGINAL'
    });
  });

  test('MR-phantom-LE', () => {
    return testFile('MR-phantom-LE', {
      columns: 256,
      rows: 256,
      pixelSpacing: [1.5625, 1.5625],
      pixelFormat: 'int16',
      pixelDataCharacteristics: 'ORIGINAL'
    });
  });

  test('MR-phantom-lossless', () => {
    return testFile('MR-phantom-lossless', {
      columns: 256,
      rows: 256,
      pixelSpacing: [1.5625, 1.5625],
      pixelFormat: 'int16',
      pixelDataCharacteristics: 'ORIGINAL'
    });
  });

  test('MR-RGB-Head-MRA', () => {
    return testFile('MR-RGB-Head-MRA', {
      columns: 512,
      rows: 512,
      pixelFormat: 'rgba8',
      pixelDataCharacteristics: 'DERIVED',
      samplesPerPixel: 3
    });
  });

  // TODO: Skipping this because this is somehow very slow
  test.skip('CR-LIDC-MONOCROME1', () => {
    // Checks MONOCHROME1 PhotometricRepresentation
    return testFile('CR-LIDC-MONOCROME1', {
      columns: 2140,
      rows: 1760
    });
  });
});
