'use strict';

var Benchmark = require('benchmark');
var Encoder = require('../lib/server/image-encoders/PngJsImageEncoder').default;
var streamBuffers = require('stream-buffers');

var enc = new Encoder();

var width = 512;
var height = 512;

var imageData = Buffer.alloc(width * height);
for (var x = 0; x < width; x++) {
  for (var y = 0; y < height; y++) {
    imageData.writeUInt8(x % 256, x + y * width);
  }
}

var suite = new Benchmark.Suite();
suite
  .add('pngjs (pure JS)', {
    defer: true,
    fn: function(deferred) {
      var out = new streamBuffers.WritableStreamBuffer();
      enc.write(out, imageData, width, height);
      out.on('finish', function() {
        deferred.resolve();
      });
    }
  })
  .on('cycle', function(event) {
    console.log(event.target.toString());
  });
suite.run({ async: true });
