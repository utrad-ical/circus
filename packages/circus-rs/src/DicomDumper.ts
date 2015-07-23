/**
 * DICOM Dumper interface
 */

import RawData from './RawData';

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
	 * @param callback callback function called when reading finished.
	 *
	 */
	public readDicom(dcmdir: string, config: any, callback: (rawData: RawData) => void): void
	{
		// abstract
	}
}
