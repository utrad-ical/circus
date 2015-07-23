/**
 * DICOM Server module prototype.
 */
import DicomReader = require('../DicomReader');
import PNGWriter = require('../PNGWriter');
import http = require('http');

export = DicomServerModule;

class DicomServerModule {

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

	public process(req: http.ServerRequest, res: http.ServerResponse, reader: DicomReader): void
	{
		// abstract
	}

}
