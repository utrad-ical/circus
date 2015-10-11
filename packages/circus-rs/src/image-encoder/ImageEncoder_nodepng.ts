import ImageEncoder from './ImageEncoder';
import stream = require('stream');

var Png = require('png').Png;

export default class ImageEncoder_nodepng extends ImageEncoder {
	public write(out: stream.Writable, image: Buffer, width: number, height: number): void {
		var png = new Png(image, width, height, 'gray', 8);
		png.encode(function (png_data) {
			out.end(png_data);
		});
	}
}
