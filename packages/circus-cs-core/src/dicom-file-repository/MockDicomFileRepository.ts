import DicomFileRepository, {
  SeriesLoaderInfo,
  SeriesLoader
} from "./DicomFileRepository";

export default class MockDicomFileRepository extends DicomFileRepository {
  public getSeriesLoader(seriesUID: string): Promise<SeriesLoaderInfo> {
    const seriesLoader: SeriesLoader = function(
      image: number
    ): Promise<ArrayBuffer> {
      if (image < 1 || image > 5) return Promise.reject("out of range");
      return Promise.resolve(new ArrayBuffer(100));
    };
    return Promise.resolve({ seriesLoader, count: 5 });
  }
}
