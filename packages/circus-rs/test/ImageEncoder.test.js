const assert = require('chai').assert;

const encoders = ['PngJsImageEncoder', 'NodePngImageEncoder'];

describe('ImageEncoder', function() {
  let originalImage;

  before(function() {
    originalImage = Buffer.alloc(16 * 16);
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        originalImage.writeUInt8(x * 16 + y, y * 16 + y);
      }
    }
  });

  encoders.forEach(function(enc) {
    const testName = 'must encode image to PNG using ' + enc;
    let encClass;
    try {
      encClass = require('../src/server/helper/image-encoder/' + enc).default;
    } catch (e) {
      it.skip(testName);
      return;
    }
    it(testName, function(done) {
      const encoder = new encClass();
      encoder.write(originalImage, 16, 16).then(out => {
        out.on('finish', function() {
          const hdr = out.read(8).toString('hex');
          // The fixed 10-byte PNG header
          assert.equal(hdr, '89504e470d0a1a0a');
          done();
        });
      });
    });
  });
});
