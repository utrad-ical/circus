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

	protected respondError(status: number, res: http.ServerResponse, message: string): void
	{
		res.writeHead(status);
		res.setHeader('Content-Type', 'application/octet-stream');
		res.setHeader('Access-Control-Allow-Origin', '*');
		logger.warn(message);
		var err = { message: message };
		res.write(JSON.stringify(err));
		res.end();
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
