import DicomVolume from '../../common/DicomVolume';
import { SeriesLoaderInfo } from '../dicom-file-repository/DicomFileRepository';

/**
 * Base DICOM Dumper class.
 */
abstract class DicomDumper {

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
	 * @param seriesLoader series loader function
	 * @param config request specific parameter (if needed)
	 */
	public abstract readDicom(seriesLoaderInfo: SeriesLoaderInfo, config: any): Promise<DicomVolume>;
}

export default DicomDumper;