import DicomFileRepository, { SeriesAccessor } from './DicomFileRepository';
import { multirange } from 'multi-integer-range';

type SeriesDataMap = Map<number, ArrayBuffer>;

export default class MemoryDicomFileRepository implements DicomFileRepository {
  private storage: Map<string, SeriesDataMap>;

  constructor(private options: object) {
    this.storage = new Map();
  }

  public async getSeries(seriesUid: string): Promise<SeriesAccessor> {
    const seriesData: SeriesDataMap = this.storage.has(seriesUid)
      ? this.storage.get(seriesUid)!
      : new Map();

    const count = multirange();
    seriesData.forEach((v, key) => count.append(key));

    this.storage.set(seriesUid, seriesData);

    const load = async (image: number) => {
      const result = seriesData.get(image);
      if (result) return result;
      throw new RangeError('Not Found');
    };

    const save = async (image: number, buffer: ArrayBuffer) => {
      seriesData.set(image, buffer);
      count.append(image);
    };

    return {
      load,
      save,
      get images() {
        return count.toString();
      }
    };
  }
}
