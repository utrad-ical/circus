import { RsHttpClient } from '../../http-client/rs-http-client';
import DicomVolumeLoader from './DicomVolumeLoader';
import IndexedDbCache from '../../util/IndexedDbCache';
import DicomVolume from '../../../common/DicomVolume';
import { DicomVolumeMetadata } from './DicomVolumeLoader';

export default class RsVolumeLoader implements DicomVolumeLoader {
  private client: RsHttpClient;
  private series: string;
  private meta: DicomVolumeMetadata;

  private cache: IndexedDbCache<ArrayBuffer | DicomVolumeMetadata>;

  constructor({ host, token, series }: any) {
    this.client = new RsHttpClient(host, token);
    this.series = series;
  }

  public useCache(
    cache: IndexedDbCache<ArrayBuffer | DicomVolumeMetadata>
  ): void {
    this.cache = cache;
  }

  public async loadMeta(): Promise<DicomVolumeMetadata> {
    if (!this.series) throw new Error('Series is required');

    let meta: DicomVolumeMetadata | undefined;
    if (this.cache) {
      const cache = <Promise<DicomVolumeMetadata>>this.cache.get(
        this.series + '.meta'
      );
      if (cache) meta = await cache;
    }
    if (!meta) {
      meta = (await this.client.request(
        `series/${this.series}/metadata`,
        {}
      )) as DicomVolumeMetadata;
    }
    this.meta = meta;
    if (this.cache) this.cache.put(this.series + '.meta', meta);
    return meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    if (!this.series) throw new Error('Series is required');

    let buffer: ArrayBuffer | undefined;
    if (this.cache) {
      const cache = this.cache.get(this.series + '.buffer');
      if (cache) buffer = await buffer;
    }
    if (!buffer) {
      buffer = await this.client.request(
        `series/${this.series}/volume`,
        {},
        'arraybuffer'
      );
    }

    const meta = this.meta;
    const volume = new DicomVolume(meta.voxelCount, meta.pixelFormat);
    volume.setVoxelSize(meta.voxelSize);
    if (meta.dicomWindow) volume.dicomWindow = meta.dicomWindow;
    if (meta.estimatedWindow) volume.estimatedWindow = meta.estimatedWindow;
    volume.assign(buffer as ArrayBuffer);

    if (this.cache && buffer) this.cache.put(this.series + '.buffer', buffer);
    return volume;
  }
}
