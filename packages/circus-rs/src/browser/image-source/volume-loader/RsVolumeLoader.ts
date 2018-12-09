import RsHttpClient from '../../http-client/RsHttpClient';
import DicomVolumeLoader from './DicomVolumeLoader';
import DicomVolume from '../../../common/DicomVolume';
import { DicomVolumeMetadata } from './DicomVolumeLoader';
import PartialVolumeDescriptor from '../../../common/PartialVolumeDescriptor';
import VolumeCache, { nullVolumeCache } from './cache/VolumeCache';

interface RsVolumeLoaderOptions {
  rsHttpClient: RsHttpClient;
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  cache?: VolumeCache;
}

export default class RsVolumeLoader implements DicomVolumeLoader {
  private rsHttpClient: RsHttpClient;
  private seriesUid: string;
  private partialVolumeDescriptor?: PartialVolumeDescriptor;
  private meta: DicomVolumeMetadata | undefined;
  private cache: VolumeCache;

  constructor({
    rsHttpClient,
    seriesUid,
    partialVolumeDescriptor,
    cache
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
    this.cache = cache || nullVolumeCache;
  }

  public async loadMeta(): Promise<DicomVolumeMetadata> {
    if (this.meta) return this.meta;
    let meta: DicomVolumeMetadata | undefined;
    meta = await this.cache.getMetadata(this.seriesUid);
    if (!meta) {
      meta = (await this.rsHttpClient.request(
        `series/${this.seriesUid}/metadata`,
        this.createRequestParams()
      )) as DicomVolumeMetadata;
      await this.cache.putMetadata(this.seriesUid, meta);
    }
    this.meta = meta;
    return meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    if (!this.meta) throw new Error('Medatadata not loaded yet');

    let buffer: ArrayBuffer | undefined;
    buffer = await this.cache.getVolume(this.seriesUid);
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

    if (buffer) await this.cache.putVolume(this.seriesUid, buffer);
    return volume;
  }

  private createRequestParams(): object {
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
