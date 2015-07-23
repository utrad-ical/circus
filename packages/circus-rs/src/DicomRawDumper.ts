/**
 * DICOM Dumper interface
 */

import RawData from './RawData';

export default class DicomDumper {

	protected config: any = null;

	constructor(config: any) {
		this.config = config || {};
		this.initialize();
	}

	protected initialize() {
		// abstract
	}

	/**
	 * read header/image from DICOM data.
	 *
	 * @param series DICOM series instance id.
	 * @param config request specific parameter (if needed)
	 * @param callback callback function called when reading started.
	 *
	 */
	public dump(series: string, config: any, callback: (data: any) => void): void
	{
		// abstract
	}
}
