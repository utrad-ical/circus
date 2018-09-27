export interface SeriesAccessor {
  load: (image: number) => Promise<ArrayBuffer>;
  save: (image: number, buffer: ArrayBuffer) => Promise<void>;
  readonly images: string;
}

export default interface DicomFileRepository {
  getSeries(seriesUid: string): Promise<SeriesAccessor>;
}
