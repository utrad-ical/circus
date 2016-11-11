import DicomFileRepository, { SeriesLoaderInfo, SeriesLoader } from "./DicomFileRepository";

export default class MockDicomFileRepository extends DicomFileRepository {
	public getSeriesLoader(seriesUID: string): Promise<SeriesLoaderInfo> {
		const seriesLoader = function(image: number): Promise<ArrayBuffer> {
			return Promise.resolve(new ArrayBuffer(100));
		};
		return Promise.resolve({ seriesLoader, count: 10 });
	}
}
