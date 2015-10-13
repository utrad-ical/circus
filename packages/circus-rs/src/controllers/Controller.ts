/**
 * DICOM Server module prototype.
 */
var url = require('url');
import stream = require('stream');
import ImageEncoder from '../image-encoder/ImageEncoder';
import http = require('http');
import logger from '../Logger';
import AsyncLruCache from '../AsyncLruCache';
import RawData from '../RawData';
import { Validator, ValidatorRules } from '../Validator';

export default class Controller {

	protected reader: AsyncLruCache<RawData>;
	protected imageEncoder: ImageEncoder;

	constructor(reader: AsyncLruCache<RawData>, imageEncoder: ImageEncoder) {
		this.reader = reader;
		this.imageEncoder = imageEncoder;
		this.initialize();
	}

	protected initialize() {
		// abstract
	}

	public execute(req: http.ServerRequest, res: http.ServerResponse): void
	{
		var rawQuery = url.parse(req.url, true).query;
		var validator = new Validator(this.getRules());
		var {result, errors} = validator.validate(rawQuery);
		if (errors.length) {
			this.respondBadRequest(res, errors.join('\n'));
		} else {
			this.process(result, res);
		}
	}

	public options(req: http.ServerRequest, res: http.ServerResponse): void
	{
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET');
		res.setHeader('Access-Control-Allow-Headers', 'Authorization');
		res.writeHead(200);
		res.end();
	}

	protected process(query: any, res: http.ServerResponse): void
	{
		// abstract
	}

	protected getRules(): ValidatorRules
	{
		return {};
	}

	protected respondImage(res: http.ServerResponse, image: Buffer, width: number, height: number)
	{
		res.writeHead(200,
			{
				'Content-Type': this.imageEncoder.mimeType(),
				'Access-Control-Allow-Origin': '*'
			});
		this.imageEncoder.write(res, image, width, height);
	}

	protected respondJsonWithStatus(status: number, res: http.ServerResponse, data: any): void
	{
		var result: string = null;
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

	protected respondJson(res: http.ServerResponse, data: any): void
	{
		this.respondJsonWithStatus(200, res, data);
	}

	protected respondError(status: number, res: http.ServerResponse, message: string): void
	{
		logger.warn(message);
		var err = { result: 'ng', message: message };
		this.respondJsonWithStatus(status, res, err);
	}

	protected respondBadRequest(res: http.ServerResponse, message: string): void
	{
		this.respondError(400, res, message);
	}

	protected respondNotFound(res: http.ServerResponse, message: string): void
	{
		this.respondError(404, res, message);
	}

	protected respondInternalServerError(res: http.ServerResponse, message: string): void
	{
		this.respondError(500, res, message);
	}

}
