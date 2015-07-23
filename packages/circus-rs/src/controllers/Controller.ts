/**
 * DICOM Server module prototype.
 */
var url = require('url');
import DicomReader from '../DicomReader';
import PNGWriter from '../PNGWriter';
import http = require('http');
import logger from '../Logger';

export default class Controller {

	protected reader: DicomReader;
	protected pngWriter: PNGWriter;

	constructor(reader: DicomReader, pngWriter: PNGWriter) {
		this.reader = reader;
		this.pngWriter = pngWriter;
		this.initialize();
	}

	protected initialize() {
		// abstract
	}

	public execute(req: http.ServerRequest, res: http.ServerResponse): void
	{
		var query = url.parse(req.url, true).query;
		this.process(query, res);
	}

	protected process(query: any, res: http.ServerResponse): void
	{
		// abstract
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
		var err = { message: message };
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
