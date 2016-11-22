import Logger from '../loggers/Logger';
import ImageEncoder from '../image-encoders/ImageEncoder';
import * as express from 'express';
import AsyncLruCache from '../../common/AsyncLruCache';
import RawData from '../../common/RawData';
import { Validator, ValidatorRules } from '../../common/Validator';
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
		this.initialize();
	}

	protected initialize(): void {
		// abstract
	}

	public execute(req: express.Request, res: express.Response, next: express.NextFunction): void {
		const origQuery = req.query;
		const validator = new Validator(this.getRules());
		const {result, errors} = validator.validate(origQuery);
		if (errors.length) {
			next(this.createBadRequestError(errors.join('\n')));
			return;
		}

		try {
			req.query = result;
			this.process(req, res, next);
		} catch (e) {
			next(e);
		}
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
			'Content-Type': this.imageEncoder.mimeType(),
		});
		this.imageEncoder.write(res, image, width, height);
	}

	protected respondJson(res: express.Response, data: any): void {
		res.json(data);
		res.end();
	}

	protected createError(status: number, message: string): Error {
		const error = new Error(message);
		(error as any).status = status;
		return error;
	}

	protected createBadRequestError(message: string): Error {
		return this.createError(400, message);
	}

	protected createNotFoundError(message: string): Error {
		return this.createError(404, message);
	}

	protected createInternalServerError(message: string): Error {
		return this.createError(500, message);
	}

}
