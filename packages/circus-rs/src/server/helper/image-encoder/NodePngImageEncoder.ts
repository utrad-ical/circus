import { NoDepFunctionService } from '@utrad-ical/circus-lib';
import ImageEncoder from './ImageEncoder';
import stream from 'stream';
import Png from 'png';

/**
 * An ImageEncoder implementation which uses 'node-png' module
 * which is a binary (C-based) module.
 */
const NodePngImageEncoder: NoDepFunctionService<
  ImageEncoder,
  {}
> = async () => {
  const write = async (image: Buffer, width: number, height: number) => {
    const png = new Png(image, width, height, 'gray', 8);
    const out = new stream.PassThrough();
    return new Promise<stream.Readable>(resolve => {
      png.encode(function(png_data: any): void {
        out.end(png_data);
        resolve(out);
      });
    });
  };
  return {
    mimeType: () => 'image/png',
    write
  };
};

export default NodePngImageEncoder;
