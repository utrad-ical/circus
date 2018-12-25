import RsHttpClient from '../../http-client/RsHttpClient';
import DicomVolumeLoader from './DicomVolumeLoader';
import DicomVolume from '../../../common/DicomVolume';
import { DicomVolumeMetadata } from './DicomVolumeLoader';
import PartialVolumeDescriptor, {
  isValidPartialVolumeDescriptor
} from '@utrad-ical/circus-lib/lib/PartialVolumeDescriptor';
import VolumeCache, { nullVolumeCache } from './cache/VolumeCache';

type EstimateWindowType = 'full' | 'first' | 'center' | 'none';

interface RsVolumeLoaderOptions {
  rsHttpClient: RsHttpClient;
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  cache?: VolumeCache;
  estimateWindowType?: EstimateWindowType;
}

export default class RsVolumeLoader implements DicomVolumeLoader {
  private rsHttpClient: RsHttpClient;
  private seriesUid: string;
  private partialVolumeDescriptor?: PartialVolumeDescriptor;
  private meta: DicomVolumeMetadata | undefined;
  private cache: VolumeCache;
  private estimateWindowType: EstimateWindowType;

  constructor({
    rsHttpClient,
    seriesUid,
    partialVolumeDescriptor,
    cache,
    estimateWindowType = 'none'
  }: RsVolumeLoaderOptions) {
    if (!seriesUid) throw new Error('SeriesUid is required.');

    if (
      partialVolumeDescriptor &&
      !isValidPartialVolumeDescriptor(partialVolumeDescriptor)
    ) {
      throw new Error('Invalid partial volume descriptor specified.');
    }

    this.rsHttpClient = rsHttpClient;
    this.seriesUid = seriesUid;
    this.partialVolumeDescriptor = partialVolumeDescriptor;
    this.estimateWindowType = estimateWindowType;
    this.cache = cache || nullVolumeCache;
  }

  public async loadMeta(): Promise<DicomVolumeMetadata> {
    if (this.meta) return this.meta;
    const cacheKey = this.createKey('metadata');
    let meta: DicomVolumeMetadata | undefined;
    meta = await this.cache.getMetadata(cacheKey);
    if (!meta) {
      meta = (await this.rsHttpClient.request(
        `series/${this.seriesUid}/metadata`,
        this.createRequestParams()
      )) as DicomVolumeMetadata;
      await this.cache.putMetadata(cacheKey, meta);
    }
    this.meta = meta;
    return meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    if (!this.meta) throw new Error('Medatadata not loaded yet');
    const cacheKey = this.createKey('buffer');
    let buffer: ArrayBuffer | undefined;
    buffer = await this.cache.getVolume(cacheKey);
    if (!buffer) {
      buffer = await this.rsHttpClient.request(
        `series/${this.seriesUid}/volume`,
        this.createRequestParams(),
        'arraybuffer'
      );
    }

    const meta = this.meta;
    const volume = new DicomVolume(meta.voxelCount, meta.pixelFormat);
    volume.setVoxelSize(meta.voxelSize);
    if (meta.dicomWindow) volume.dicomWindow = meta.dicomWindow;
    if (meta.estimatedWindow) volume.estimatedWindow = meta.estimatedWindow;
    volume.assign(buffer as ArrayBuffer);

    if (buffer) await this.cache.putVolume(cacheKey, buffer);
    return volume;
  }

  private createKey(suffix: string): string {
    const pvd = this.partialVolumeDescriptor;
    const pvdStr = pvd ? `:${pvd.start}:${pvd.end}:${pvd.delta}` : ':full';
    return this.seriesUid + pvdStr + '.' + suffix;
  }

  private createRequestParams(): object {
    const result = {};
    if (this.estimateWindowType !== 'none') {
      Object.assign(result, { estimateWindow: this.estimateWindowType });
    }
    if (this.partialVolumeDescriptor) {
      const partialVolumeDescriptor = this.partialVolumeDescriptor;
      Object.assign(result, {
        start: partialVolumeDescriptor.start,
        end: partialVolumeDescriptor.end,
        delta: partialVolumeDescriptor.delta || 1
      });
    }
    return result;
  }
}
