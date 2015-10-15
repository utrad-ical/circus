/**
 * DICOM Dumper interface
 */

import RawData from '../RawData';
import Promise = require('bluebird');

export default class DicomDumper {

	protected config: any = null;

	constructor(config: any) {
		this.config = config;
		this.initialize();
	}

	protected initialize() {
		// abstract
	}

	/**
	 * read header/image from DICOM data.
	 *
	 * @param dcmdir path of DICOM series data directory.
	 * @param config request specific parameter (if needed)
	 */
	public readDicom(dcmdir: string, config: any): Promise<RawData>
	{
		// abstract
		return null;
	}
}
