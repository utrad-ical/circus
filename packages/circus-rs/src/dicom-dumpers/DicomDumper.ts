/**
 * DICOM Dumper interface
 */

import DicomVolume from '../DicomVolume';
import { Promise } from 'es6-promise';

export default class DicomDumper {

	protected config: any = null;

	constructor(config: any) {
		this.config = config;
		this.initialize();
	}

	protected initialize(): void {
		// abstract
	}

	/**
	 * read header/image from DICOM data.
	 *
	 * @param dcmdir path of DICOM series data directory.
	 * @param config request specific parameter (if needed)
	 */
	public readDicom(dcmdir: string, config: any): Promise<DicomVolume> {
		// abstract
		return null;
	}
}
