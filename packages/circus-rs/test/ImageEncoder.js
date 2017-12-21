var assert = require('chai').assert;

var encoders = ['PngJsImageEncoder', 'NodePngImageEncoder'];

describe('ImageEncoder', function() {
  var originalImage;

  before(function() {
    originalImage = new Buffer(16 * 16);
    for (var x = 0; x < 16; x++) {
      for (var y = 0; y < 16; y++) {
        originalImage.writeUInt8(x * 16 + y, y * 16 + y);
      }
    }
  });

  encoders.forEach(function(enc) {
    var testName = 'must encode image to PNG using ' + enc;
    try {
      var encClass = require('../src/server/image-encoders/' + enc).default;
    } catch (e) {
      it.skip(testName);
      return;
    }
    it(testName, function(done) {
      var encoder = new encClass();
      encoder.write(originalImage, 16, 16).then(out => {
        out.on('finish', function() {
          var hdr = out.read(8).toString('hex');
          // The fixed 10-byte PNG header
          assert.equal(hdr, '89504e470d0a1a0a');
          done();
        });
      });
    });
  });
});
