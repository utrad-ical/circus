'use strict';

const dicomImageExtractor = require('../src/common/dicomImageExtractor')
  .default;
const fs = require('fs');
const zlib = require('zlib');
const assert = require('chai').assert;
const px = require('../src/common/PixelFormat');

const ImageEncoder = require('../src/server/helper/image-encoder/PngJsImageEncoder')
  .default;

const testdir = __dirname + '/test-dicom/';

describe('dicomImageExtractor', function() {
  function test(done, file, content, checks) {
    const extract = dicomImageExtractor();
    const { metadata, pixelData } = extract(content.buffer);

    for (const key in checks) {
      assert.deepEqual(checks[key], metadata[key]);
    }
    const pxInfo = px.pixelFormatInfo(metadata.pixelFormat);
    assert.equal(
      metadata.columns * metadata.rows * pxInfo.bpp,
      pixelData.byteLength
    );
    const readArray = new pxInfo.arrayClass(pixelData);

    const doRescale =
      metadata.rescale && typeof metadata.rescale.intercept === 'number';
    typeof metadata.rescale.slope === 'number';

    // write PNG image
    const encoder = new ImageEncoder();
    const arr = new Uint8ClampedArray(metadata.columns * metadata.rows);
    const useWindow = metadata.window
      ? metadata.window
      : {
          level: (metadata.maxValue + metadata.maxValue) / 2,
          width: metadata.maxValue - metadata.minValue
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
    encoder
      .write(Buffer.from(arr.buffer), metadata.columns, metadata.rows)
      .then(out => {
        const stream = fs.createWriteStream(testdir + file + '.png');
        out.pipe(stream);
        stream.on('close', done);
      });
  }

  function testFile(file, checks) {
    it('must parse ' + file, function(done) {
      // Test file can be either a raw DICOM file or a gzipped one
      try {
        const zippedFileContent = fs.readFileSync(testdir + file + '.gz');
        zlib.unzip(zippedFileContent, function(err, fileContent) {
          if (err) throw err;
          test(done, file, fileContent, checks);
        });
      } catch (err) {
        const fileContent = fs.readFileSync(testdir + file);
        test(done, file, fileContent, checks);
      }
    });
  }

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
