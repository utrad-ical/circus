/**
 * SeriesLoader is a loader function that returns (via promise)
 * the contents of the DICOM file specified by the image number.
 */
export type SeriesLoader = (image: number) => Promise<ArrayBuffer>;

export type SeriesLoaderInfo = {
	seriesLoader: SeriesLoader;
	count: number;
}

/**
 * Base DicomFileRepository class. An DicomFileRepository receives a series instance UID
 * and returns a promise-based higher-order SeriesLoader function.
 * The returned function works as the loader to fetch the binary data
 * of the corresponding DICOM file.
 */
export default class DicomFileRepository {
	protected config: any = null;

	constructor(config: any) {
		this.config = config;
		this.initialize();
	}

	protected initialize(): void {
		// do nothing by default
	}

	public getSeriesLoader(seriesUID: string): Promise<SeriesLoaderInfo> {
		// abstract
		return null;
	}
}
