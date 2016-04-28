import ImageEncoder from './ImageEncoder';
import * as stream from 'stream';

var Png = require('png').Png;

/**
 * An ImageEncoder implementation which uses 'node-png' module
 * which is a binary (C-based) module.
 */
export default class ImageEncoder_nodepng extends ImageEncoder {
	public write(out: stream.Writable, image: Buffer, width: number, height: number): void {
		var png = new Png(image, width, height, 'gray', 8);
		png.encode(function (png_data) {
			out.end(png_data);
		});
	}
}
