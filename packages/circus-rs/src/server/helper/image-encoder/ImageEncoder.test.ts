import assert from 'node:assert/strict';
import { describe, test, it, beforeEach } from 'node:test';
import type ImageEncoder from './ImageEncoder.ts';

const encoders = ['PngJsImageEncoder' /*'NodePngImageEncoder'*/];

// Encoders whose dependencies are not installed are skipped
const encModules = new Map<string, any>();
for (const enc of encoders) {
  try {
    encModules.set(enc, (await import(`./${enc}.ts`)).default);
  } catch {
    // not available
  }
}

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

  for (const enc of encoders) {
    const testName = 'must encode image to PNG using ' + enc;
    const encModule = encModules.get(enc);
    if (!encModule) {
      it.skip(testName);
      continue;
    }
    test(testName, (_t, done) => {
      encModule().then((encoder: ImageEncoder) =>
        encoder.write(originalImage, 16, 16).then(out => {
          out.on('finish', () => {
            const hdr = out.read(8).toString('hex');
            // The fixed 10-byte PNG header
            assert.equal(hdr, '89504e470d0a1a0a');
            done();
          });
        })
      );
    });
  }
});
