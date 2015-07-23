/**
 * DICOM Server module prototype.
 */
import DicomReader = require('../DicomReader');
import http = require('http');

export = DicomServerModule;

class DicomServerModule {

	protected config: any = null;

	constructor(config: any) {

		this.config = config || {};
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
