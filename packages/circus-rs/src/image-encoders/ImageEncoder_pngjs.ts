import ImageEncoder from './ImageEncoder';
import stream = require('stream');

var PNG = require('pngjs').PNG;

export default class ImageEncoder_pngjs extends ImageEncoder {
	public write(out: stream.Writable, image: Buffer, width: number, height: number): void {
		var png = new PNG({width, height});
		for (var y = 0; y < png.height; y++) {
			for (var x = 0; x < png.width; x++) {
				var srcidx = (png.width * y + x);
				var dstidx = srcidx << 2;
				var pixel = image.readInt8(srcidx);
				png.data[dstidx] = pixel;
				png.data[dstidx + 1] = pixel;
				png.data[dstidx + 2] = pixel;
				png.data[dstidx + 3] = 0xff;
			}
		}

		png.pack().pipe(out);
	}
}
