import type { SeriesAccessor } from './DicomFileRepository.ts';
import type DicomFileRepository from './DicomFileRepository.ts';
import * as mr from 'multi-integer-range';

type SeriesDataMap = Map<number, ArrayBuffer>;

export default class MemoryDicomFileRepository implements DicomFileRepository {
  private storage: Map<string, SeriesDataMap>;
  private options: object;

  constructor(options: object) {
    this.options = options;
    this.storage = new Map();
  }

  public async getSeries(seriesUid: string): Promise<SeriesAccessor> {
    const seriesData: SeriesDataMap = this.storage.has(seriesUid)
      ? this.storage.get(seriesUid)!
      : new Map();

    let count = mr.normalize(seriesData.keys());

    this.storage.set(seriesUid, seriesData);

    const load = async (image: number) => {
      const result = seriesData.get(image);
      if (result) return result;
      throw new RangeError('Not Found');
    };

    const save = async (image: number, buffer: ArrayBuffer) => {
      seriesData.set(image, buffer);
      count = mr.append(count, mr.normalize(image));
    };

    return {
      load,
      save,
      get images() {
        return mr.stringify(count);
      }
    };
  }

  public async deleteSeries(seriesUid: string): Promise<void> {
    this.storage.delete(seriesUid);
  }
}
