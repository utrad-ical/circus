import Logger from '../loggers/Logger';
import ImageEncoder from '../image-encoders/ImageEncoder';
import * as express from 'express';
import AsyncLruCache from '../../common/AsyncLruCache';
import RawData from '../../common/RawData';
import { ValidatorRules } from '../../common/Validator';
import { validate } from './Middleware';
import * as zlib from 'zlib';
import * as stream from 'stream';

/**
 * Base DICOM Server controller.
 */
export default class Controller {

	protected logger: Logger;
	protected reader: AsyncLruCache<RawData>;
	protected imageEncoder: ImageEncoder;

	constructor(logger: Logger, reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder) {
		this.logger = logger;
		this.reader = reader;
		this.imageEncoder = imageEncoder;
	}

	public middlewares(
		logger: Logger, reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder
	): express.Handler[] {
		return [
			validate(this.getRules()),
			this.process.bind(this)
		];
	}

	public options(req: express.Request, res: express.Response, next: express.NextFunction): void {
		res.status(200);
		res.setHeader('Access-Control-Allow-Methods', 'GET');
		res.setHeader('Access-Control-Allow-Headers', 'Authorization');
		res.end();
	}

	protected process(req: express.Request, res: express.Response, next: express.NextFunction): void {
		// abstract
	}

	protected getRules(): ValidatorRules {
		return {};
	}

	protected respondGzippedArrayBuffer(res: express.Response, buffer: ArrayBuffer): void {
		let out: any = new stream.Readable();
		out._read = function(size) {
			this.push(new Buffer(new Uint8Array(buffer)));
			this.push(null); // ends stream
		};
		this.respondGzippedStream(res, out);
	}

	protected respondGzippedStream(res: express.Response, stream: stream.Stream): void {
		res.writeHead(200, {
			'Content-Type': 'application/octet-stream',
			'Content-Encoding': 'gzip'
		});
		let gzip = zlib.createGzip();
		stream.pipe(gzip).pipe(res);
	}

	protected respondImage(res: express.Response, image: Buffer, width: number, height: number): void {
		res.writeHead(200, {
			'Content-Type': this.imageEncoder.mimeType()
		});
		this.imageEncoder.write(res, image, width, height);
	}

}
