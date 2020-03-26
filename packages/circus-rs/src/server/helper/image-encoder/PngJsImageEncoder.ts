import { NoDepFunctionService } from '@utrad-ical/circus-lib';
import ImageEncoder from './ImageEncoder';
import stream from 'stream';
import { PNG } from 'pngjs';

/**
 * An ImageEncoder implementation which uses 'pngjs' module,
 * a pure-JS encoding solution.
 */
const PngJsImageEncoder: NoDepFunctionService<ImageEncoder, {}> = async () => {
  const write = async (image: Buffer, width: number, height: number) => {
    const png = new PNG({ width, height });
    const out = new stream.PassThrough();
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        const srcidx = png.width * y + x;
        const dstidx = srcidx << 2;
        const pixel = image.readInt8(srcidx);
        png.data[dstidx] = pixel;
        png.data[dstidx + 1] = pixel;
        png.data[dstidx + 2] = pixel;
        png.data[dstidx + 3] = 0xff;
      }
    }
    png.pack().pipe(out);
    return out as stream.Readable;
  };
  return {
    mimeType: () => 'image/png',
    write
  };
};

export default PngJsImageEncoder;
