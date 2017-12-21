'use strict';

var extractor = require('../src/server/dicom-dumpers/DicomPixelExtractor');
var fs = require('fs');
var zlib = require('zlib');
var assert = require('chai').assert;
var px = require('../src/common/PixelFormat');

var ImageEncoder = require('../src/server/image-encoders/PngJsImageEncoder')
  .default;

var testdir = __dirname + '/test-dicom/';

describe('DicomPixelExtractor', function() {
  function test(done, file, content, checks) {
    var ex = new extractor.DicomPixelExtractor();
    var data = ex.extract(new Uint8Array(content.buffer));
    for (var key in checks) {
      assert.deepEqual(checks[key], data[key]);
    }
    var pxInfo = px.pixelFormatInfo(data.pixelFormat);
    assert.equal(
      data.columns * data.rows * pxInfo.bpp,
      data.pixelData.byteLength
    );
    var readArray = new pxInfo.arrayClass(data.pixelData);

    var doRescale = data.rescale && typeof data.rescale.intercept === 'number';
    typeof data.rescale.slope === 'number';

    // write PNG image
    var encoder = new ImageEncoder();
    var arr = new Uint8ClampedArray(data.columns * data.rows);
    var useWindow = data.window
      ? data.window
      : {
          level: (data.maxValue + data.maxValue) / 2,
          width: data.maxValue - data.minValue
        };
    var ww = useWindow.width;
    var wl = useWindow.level;
    for (var x = 0; x < data.columns; x++) {
      for (var y = 0; y < data.rows; y++) {
        var pixel = readArray[x + y * data.columns];
        if (doRescale) {
          pixel = pixel * data.rescale.slope + data.rescale.intercept;
        }
        var o = Math.round((pixel - wl + ww / 2) * (255 / ww));
        arr[x + y * data.columns] = pixel;
      }
    }
    encoder.write(new Buffer(arr), data.columns, data.rows).then(out => {
      var stream = fs.createWriteStream(testdir + file + '.png');
      out.pipe(stream);
      stream.on('close', done);
    });
  }

  function testFile(file, checks) {
    it('must parse ' + file, function(done) {
      // Test file can be either a raw DICOM file or a gzipped one
      try {
        var zippedFileContent = fs.readFileSync(testdir + file + '.gz');
        zlib.unzip(zippedFileContent, function(err, fileContent) {
          if (err) throw err;
          test(done, file, fileContent, checks);
        });
      } catch (err) {
        var fileContent = fs.readFileSync(testdir + file);
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
