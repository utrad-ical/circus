import * as stream from 'stream';

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
