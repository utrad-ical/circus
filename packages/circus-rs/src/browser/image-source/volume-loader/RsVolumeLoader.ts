import RsHttpClient from '../../http-client/RsHttpClient';
import DicomVolumeLoader from './DicomVolumeLoader';
import IndexedDbCache from '../../util/IndexedDbCache';
import DicomVolume from '../../../common/DicomVolume';
import { DicomVolumeMetadata } from './DicomVolumeLoader';
import PartialVolumeDescriptor from '../../../common/PartialVolumeDescriptor';

interface RsVolumeLoaderOptions {
  rsHttpClient: RsHttpClient;
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
}

export default class RsVolumeLoader implements DicomVolumeLoader {
  private rsHttpClient: RsHttpClient;
  private seriesUid: string;
  private partialVolumeDescriptor?: PartialVolumeDescriptor;
  private meta: DicomVolumeMetadata | undefined;

  private cache: IndexedDbCache<ArrayBuffer | DicomVolumeMetadata> | undefined;

  constructor({
    rsHttpClient,
    seriesUid,
    partialVolumeDescriptor
  }: RsVolumeLoaderOptions) {
    if (!seriesUid) throw new Error('SeriesUid is required.');

    if (
      partialVolumeDescriptor &&
      (partialVolumeDescriptor.start === undefined ||
        partialVolumeDescriptor.end === undefined)
    ) {
      throw new Error('Invalid partial volume descriptor specified.');
    }

    this.rsHttpClient = rsHttpClient;
    this.seriesUid = seriesUid;
    this.partialVolumeDescriptor = partialVolumeDescriptor;
  }

  public useCache(
    cache: IndexedDbCache<ArrayBuffer | DicomVolumeMetadata>
  ): void {
    this.cache = cache;
  }

  public async loadMeta(): Promise<DicomVolumeMetadata> {
    let meta: DicomVolumeMetadata | undefined;
    const metaCacheKey = this.seriesUid + '.meta';
    if (this.cache) {
      const cache = <Promise<DicomVolumeMetadata>>this.cache.get(metaCacheKey);
      if (cache) meta = await cache;
    }
    if (!meta) {
      meta = (await this.rsHttpClient.request(
        `series/${this.seriesUid}/metadata`,
        this.createRequestParams()
      )) as DicomVolumeMetadata;
    }
    this.meta = meta;
    if (this.cache) this.cache.put(metaCacheKey, meta);
    return meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    if (!this.meta) throw new Error('Medatadata not loaded yet');

    const bufferCacheKey = this.seriesUid + '.buffer';
    let buffer: ArrayBuffer | undefined;
    if (this.cache) {
      const cache = this.cache.get(bufferCacheKey);
      if (cache) buffer = await buffer;
    }
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

    if (this.cache && buffer) this.cache.put(bufferCacheKey, buffer);
    return volume;
  }

  private createRequestParams(): any {
    if (this.partialVolumeDescriptor) {
      const partialVolumeDescriptor = this.partialVolumeDescriptor;
      return {
        start: partialVolumeDescriptor.start,
        end: partialVolumeDescriptor.end,
        delta: partialVolumeDescriptor.delta | 1
      };
    } else {
      return {};
    }
  }
}
