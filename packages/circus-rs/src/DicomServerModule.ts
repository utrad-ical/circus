/**
 * DICOM Server module prototype.
 */
import DicomReader = require('./DicomReader');

export = DicomServerModule;

class DicomServerModule {

	protected config: any = null;

	constructor(config: any) {

		this.config = config;
		this.initialize();
	}

	protected initialize() {
		// abstract
	}

	public process(req: any, res: any, reader: DicomReader): void
	{
		// abstract
	}

}
