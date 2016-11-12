import ImageEncoder from './ImageEncoder';
import * as stream from 'stream';

import Png from 'png';

/**
 * An ImageEncoder implementation which uses 'node-png' module
 * which is a binary (C-based) module.
 */
export default class NodePngImageEncoder extends ImageEncoder {
	public write(out: stream.Writable, image: Buffer, width: number, height: number): void {
		const png = new Png(image, width, height, 'gray', 8);
		png.encode(function (png_data): void {
			out.end(png_data);
		});
	}
}
