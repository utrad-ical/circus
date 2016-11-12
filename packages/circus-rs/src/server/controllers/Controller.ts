import * as url from 'url';
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

	public execute(req: express.Request, res: express.Response): void {
		let origQuery = req.query;
		let validator = new Validator(this.getRules());
		let {result, errors} = validator.validate(origQuery);
		if (errors.length) {
			this.respondBadRequest(res, errors.join('\n'));
		} else {
			req.query = result;
			this.process(req, res);
		}
	}

	public options(req: express.Request, res: express.Response): void {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET');
		res.setHeader('Access-Control-Allow-Headers', 'Authorization');
		res.writeHead(200);
		res.end();
	}

	protected process(req: express.Request, res: express.Response): void {
		// abstract
	}

	protected getRules(): ValidatorRules {
		return {};
	}

	/**
	 * Validator function which checks the input is
	 * a valid UID (eg, series instance UID)
	 */
	protected isUID(input: string): boolean {
		return !!input.match(/^((0|[1-9]\d*)\.)*(0|[1-9]\d*)$/)
			&& input.length <= 64;
	}

	protected isTuple(count: number = 3): (string) => boolean {
		return (s: string) => {
			if (typeof s !== 'string') return false;
			let toks = s.split(',');
			if (toks.length !== count) return false;
			return !toks.some(tok => isNaN(parseFloat(tok)));
		}
	}

	protected parseTuple(count: number = 3, int: boolean = false): (string) => number[] {
		return (s: string) => s.split(',')
			.map(f => int ? parseInt(f, 10) : parseFloat(f))
			.slice(0, count);
	}

	protected parseBoolean(input: string): boolean {
		return !(/^(0|false|f|no|)$/i.test(input));
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
			'Access-Control-Allow-Origin': '*',
			'Content-Encoding': 'gzip'
		});
		let gzip = zlib.createGzip();
		stream.pipe(gzip).pipe(res);
	}

	protected respondImage(res: express.Response, image: Buffer, width: number, height: number): void {
		res.writeHead(200, {
			'Content-Type': this.imageEncoder.mimeType(),
			'Access-Control-Allow-Origin': '*'
		});
		this.imageEncoder.write(res, image, width, height);
	}

	protected respondJsonWithStatus(status: number, res: express.Response, data: any): void {
		res.status(status);
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.json(data);
		res.end();
	}

	protected respondJson(res: express.Response, data: any): void {
		this.respondJsonWithStatus(200, res, data);
	}

	protected respondError(status: number, res: express.Response, message: string): void {
		this.logger.warn(message);
		let err = {result: 'ng', message: message};
		this.respondJsonWithStatus(status, res, err);
	}

	protected respondBadRequest(res: express.Response, message: string): void {
		this.logger.warn(message);
		this.respondError(400, res, message);
	}

	protected respondNotFound(res: express.Response, message: string): void {
		this.logger.warn(message);
		this.respondError(404, res, message);
	}

	protected respondInternalServerError(res: express.Response, message: string): void {
		this.logger.error(message);
		this.respondError(500, res, message);
	}

}
