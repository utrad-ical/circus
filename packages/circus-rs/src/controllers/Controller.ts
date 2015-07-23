/**
 * DICOM Server module prototype.
 */
var url = require('url');
import DicomReader from '../DicomReader';
import PNGWriter from '../PNGWriter';
import http = require('http');

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

}
