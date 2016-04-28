import * as stream from 'stream';

/**
 * Base image encoder class. An ImageEncoder receives a 8-bit grayscale
 * image from Buffer and writes common image file data (e.g., PNG)
 * into a given stream.
 */
export default class ImageEncoder {
	protected config: any = null;

	constructor(config?: any) {
		this.config = config || null;
	}

	public mimeType(): string {
		return 'image/png';
	}

	public write(out: stream.Writable, image: Buffer, width: number, height: number): void {
		// abstract
	}
}
