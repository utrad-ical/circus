const encoders = ['PngJsImageEncoder' /*'NodePngImageEncoder'*/];
import ImageEncoder from './ImageEncoder';

describe('ImageEncoder', () => {
  let originalImage: Buffer;

  beforeEach(() => {
    originalImage = Buffer.alloc(16 * 16);
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        originalImage.writeUInt8(x * 16 + y, y * 16 + y);
      }
    }
  });

  encoders.forEach(enc => {
    const testName = 'must encode image to PNG using ' + enc;
    let encModule: any;
    try {
      encModule = require('./' + enc).default;
    } catch (e) {
      it.skip(testName);
      return;
    }
    test(testName, done => {
      encModule().then((encoder: ImageEncoder) =>
        encoder.write(originalImage, 16, 16).then(out => {
          out.on('finish', () => {
            const hdr = out.read(8).toString('hex');
            // The fixed 10-byte PNG header
            expect(hdr).toBe('89504e470d0a1a0a');
            done();
          });
        })
      );
    });
  });
});
