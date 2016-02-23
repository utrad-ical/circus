/**
 * DICOM Server module prototype.
 */
import * as url from 'url';
import ImageEncoder from '../image-encoders/ImageEncoder';
import * as http from 'http';
import logger from '../Logger';
import AsyncLruCache from '../../common/AsyncLruCache';
import RawData from '../../common/RawData';
import { Validator, ValidatorRules } from '../../common/Validator';
import * as zlib from 'zlib';
import * as stream from 'stream';

export default class Controller {

	protected reader: AsyncLruCache<RawData>;
	protected imageEncoder: ImageEncoder;

	constructor(reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder) {
		this.reader = reader;
		this.imageEncoder = imageEncoder;
		this.initialize();
	}

	protected initialize(): void {
		// abstract
	}

	public execute(req: http.ServerRequest, res: http.ServerResponse): void {
		let rawQuery = url.parse(req.url, true).query;
		let validator = new Validator(this.getRules());
		let {result, errors} = validator.validate(rawQuery);
		if (errors.length) {
			this.respondBadRequest(res, errors.join('\n'));
		} else {
			this.process(result, res);
		}
	}

	public options(req: http.ServerRequest, res: http.ServerResponse): void {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET');
		res.setHeader('Access-Control-Allow-Headers', 'Authorization');
		res.writeHead(200);
		res.end();
	}

	protected process(query: any, res: http.ServerResponse): void {
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

	protected respondGzippedArrayBuffer(res: http.ServerResponse, buffer: ArrayBuffer): void {
		let out = new stream.Readable();
		out._read = function(size) {
			this.push(new Buffer(new Uint8Array(buffer)));
			this.push(null); // ends stream
		};
		this.respondGzippedStream(res, out);
	}

	protected respondGzippedStream(res: http.ServerResponse, stream: stream.Stream): void {
		res.writeHead(200, {
			'Content-Type': 'application/octet-stream',
			'Access-Control-Allow-Origin': '*',
			'Content-Encoding': 'gzip'
		});
		let gzip = zlib.createGzip();
		stream.pipe(gzip).pipe(res);
	}

	protected respondImage(res: http.ServerResponse, image: Buffer, width: number, height: number): void {
		res.writeHead(200, {
			'Content-Type': this.imageEncoder.mimeType(),
			'Access-Control-Allow-Origin': '*'
		});
		this.imageEncoder.write(res, image, width, height);
	}

	protected respondJsonWithStatus(status: number, res: http.ServerResponse, data: any): void {
		let result: string = null;
		try {
			result = JSON.stringify(data, null, '  ');
		} catch (e) {
			this.respondInternalServerError(res, 'Error while formatting result data.');
			return;
		}
		res.setHeader('Content-Type', 'application/json');
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.writeHead(status);
		res.write(result);
		res.end();
	}

	protected respondJson(res: http.ServerResponse, data: any): void {
		this.respondJsonWithStatus(200, res, data);
	}

	protected respondError(status: number, res: http.ServerResponse, message: string): void {
		logger.warn(message);
		let err = {result: 'ng', message: message};
		this.respondJsonWithStatus(status, res, err);
	}

	protected respondBadRequest(res: http.ServerResponse, message: string): void {
		this.respondError(400, res, message);
	}

	protected respondNotFound(res: http.ServerResponse, message: string): void {
		this.respondError(404, res, message);
	}

	protected respondInternalServerError(res: http.ServerResponse, message: string): void {
		this.respondError(500, res, message);
	}

}
