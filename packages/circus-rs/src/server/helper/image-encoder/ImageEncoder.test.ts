import assert from 'node:assert/strict';
import { buffer } from 'node:stream/consumers';
import { describe, test } from 'node:test';
import { PNG } from 'pngjs';
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
  const width = 16;
  const height = 16;

  for (const enc of encoders) {
    const testName = `preserves grayscale pixels when encoding PNG with ${enc}`;
    const encModule = encModules.get(enc);
    if (!encModule) {
      test.skip(testName);
      continue;
    }
    test(testName, async () => {
      const originalImage = Buffer.from(
        Array.from({ length: width * height }, (_, i) => i)
      );
      const encoder: ImageEncoder = await encModule();
      const out = await encoder.write(originalImage, width, height);
      const decoded = PNG.sync.read(await buffer(out));

      assert.equal(decoded.width, width);
      assert.equal(decoded.height, height);
      for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        assert.deepEqual(
          [...decoded.data.subarray(offset, offset + 4)],
          [i, i, i, 255],
          `pixel ${i}`
        );
      }
    });
  }
});
