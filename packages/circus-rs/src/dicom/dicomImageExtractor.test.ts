import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import dicomImageExtractor from './dicomImageExtractor.ts';
import fs from 'fs';
import zlib from 'zlib';
import path from 'path';
import * as px from '../volume/PixelFormat.ts';
import { PNG } from 'pngjs';

const testdir = path.join(import.meta.dirname, '../../test-data/test-dicom/');

interface CheckObject {
  [key: string]: any;
}

describe('dicomImageExtractor', () => {
  const exec = (file: string, content: Buffer, checks: CheckObject) => {
    const extract = dicomImageExtractor();
    const { metadata, pixelData } = extract(content.buffer as ArrayBuffer);

    if (!metadata || !pixelData) throw new Error();

    for (const key in checks) {
      assert.deepEqual(checks[key], (metadata as any)[key]);
    }
    const pxInfo = px.pixelFormatInfo(metadata.pixelFormat);
    assert.deepEqual(
      metadata.columns * metadata.rows * pxInfo.bpp,
      pixelData.byteLength
    );
    if (metadata.pixelFormat !== 'rgba8') {
      // The reported range must be that of the actual pixels
      const values = new pxInfo.arrayClass(pixelData);
      let min = Infinity;
      let max = -Infinity;
      for (const v of values) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
      assert.deepEqual([metadata.minValue, metadata.maxValue], [min, max]);
    }

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
      // RGBA8 Image
      const readArray = new Uint8Array(pixelData);
      png.data = Buffer.from(readArray.buffer);
    } else {
      // Monochrome Image
      const readArray = new pxInfo.arrayClass(pixelData);
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

  test('accepts padded pixel data of an odd length', () => {
    // A minimal 8-bit 3x3 image (Explicit VR Little Endian)
    const element = (tag: number[], vr: string, value: Buffer) => {
      const head = Buffer.alloc(vr === 'OB' ? 12 : 8);
      head.writeUInt16LE(tag[0], 0);
      head.writeUInt16LE(tag[1], 2);
      head.write(vr, 4, 'latin1');
      if (vr === 'OB') head.writeUInt32LE(value.length, 8);
      else head.writeUInt16LE(value.length, 6);
      return Buffer.concat([head, value]);
    };
    const us = (n: number) => Buffer.from(new Uint16Array([n]).buffer);
    const pixels = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]); // padded
    const file = Buffer.concat([
      Buffer.alloc(128),
      Buffer.from('DICM', 'latin1'),
      element([2, 0x10], 'UI', Buffer.from('1.2.840.10008.1.2.1\0', 'latin1')),
      element([8, 0x60], 'CS', Buffer.from('OT', 'latin1')),
      element([0x28, 0x02], 'US', us(1)),
      element([0x28, 0x04], 'CS', Buffer.from('MONOCHROME2 ', 'latin1')),
      element([0x28, 0x10], 'US', us(3)),
      element([0x28, 0x11], 'US', us(3)),
      element([0x28, 0x100], 'US', us(8)),
      element([0x28, 0x101], 'US', us(8)),
      element([0x28, 0x102], 'US', us(7)),
      element([0x28, 0x103], 'US', us(0)),
      element([0x7fe0, 0x10], 'OB', pixels)
    ]);
    const { metadata, pixelData } = dicomImageExtractor()(
      file.buffer.slice(file.byteOffset, file.byteOffset + file.length)
    );
    assert.equal(metadata.pixelFormat, 'uint8');
    assert.deepEqual(
      [...new Uint8Array(pixelData!)],
      [1, 2, 3, 4, 5, 6, 7, 8, 9]
    );
    assert.deepEqual([metadata.minValue, metadata.maxValue], [1, 9]);
  });
});
