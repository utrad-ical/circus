import RsHttpClient from '../../http-client/RsHttpClient';
import { DicomVolumeProgressiveLoader, ProgressEventEmitter } from './DicomVolumeLoader';
import DicomVolume from '../../../common/DicomVolume';
import { DicomVolumeMetadata } from './DicomVolumeLoader';
import PartialVolumeDescriptor, {
  isValidPartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import VolumeCache, { nullVolumeCache } from './cache/VolumeCache';
import { EstimateWindowType, createRequestParams } from './rs-loader-utils';
import { TransferClientFactory } from 'browser/ws/createTransferClientFactory';
import { Range } from 'multi-integer-range';
import EventEmitter from 'events';
import setImmediate from '../../util/setImmediate';

interface RsProgressiveVolumeLoaderOptions {
  rsHttpClient: RsHttpClient;
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  cache?: VolumeCache;
  estimateWindowType?: EstimateWindowType;
  transferClientFactory: TransferClientFactory;
}

export default class RsProgressiveVolumeLoader
  extends (EventEmitter as { new(): ProgressEventEmitter })
  implements DicomVolumeProgressiveLoader {
  private rsHttpClient: RsHttpClient;
  private seriesUid: string;
  private partialVolumeDescriptor?: PartialVolumeDescriptor;
  private loadingMetaPromise: Promise<DicomVolumeMetadata> | undefined;
  private meta: DicomVolumeMetadata | undefined;
  private loadingVolumePromise: Promise<DicomVolume> | undefined;
  private cache: VolumeCache;
  private estimateWindowType: EstimateWindowType;

  private volume: DicomVolume | null = null;
  private transferClientFactory: TransferClientFactory;

  constructor({
    rsHttpClient,
    seriesUid,
    partialVolumeDescriptor,
    cache,
    estimateWindowType = 'none',
    transferClientFactory
  }: RsProgressiveVolumeLoaderOptions) {

    super();

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
    this.transferClientFactory = transferClientFactory;
  }

  public setPriority(images: string | number | (number | Range)[], priority: number): void {
    // @todo: implement here
  }

  private async _doLoadMeta(): Promise<DicomVolumeMetadata> {
    const cacheKey = this.createKey('metadata');
    let meta: DicomVolumeMetadata | undefined;
    meta = await this.cache.getMetadata(cacheKey);
    if (!meta) {
      meta = (await this.rsHttpClient.request(
        `series/${this.seriesUid}/metadata`,
        createRequestParams(
          this.partialVolumeDescriptor,
          this.estimateWindowType
        )
      )) as DicomVolumeMetadata;
      await this.cache.putMetadata(cacheKey, meta);
    }
    this.meta = meta;
    return meta;
  }

  public async loadMeta(): Promise<DicomVolumeMetadata> {
    if (this.meta) return this.meta;
    if (this.loadingMetaPromise) return await this.loadingMetaPromise;
    this.loadingMetaPromise = this._doLoadMeta();
    return await this.loadingMetaPromise;
  }

  private async _doLoadVolume(): Promise<DicomVolume> {
    if (!this.meta) throw new Error('Medatadata not loaded yet');

    this.volume = this.createVolume(this.meta);

    const cacheKey = this.createKey('buffer');
    let buffer: ArrayBuffer | undefined;
    buffer = await this.cache.getVolume(cacheKey);
    if (buffer) {
      this.volume.assign(buffer as ArrayBuffer);
    } else {
      await this._doSequentialLoading(this.meta!, this.volume);
      this.cache.putVolume(cacheKey, this.volume.data);
    }

    return this.volume;
  }

  private _doSequentialLoading(meta: DicomVolumeMetadata, volume: DicomVolume) {
    return new Promise<void>((resolve, reject) => {
      const images = new Map<number, boolean>();

      const handler = (imageNo: number, buffer: ArrayBuffer) => {
        volume.insertSingleImage(imageNo - 1, buffer);
        images.set(imageNo, true);

        const finished = images.size;
        const total = meta.voxelCount[2];

        if (finished === total) {
          console.timeEnd(`Transfering ${this.seriesUid}`);
          console.log('Complete!');
          setImmediate(() => resolve());
        }

        this.emit('progress', this, finished, total);
      };

      (async () => {
        const transferClient = await this.transferClientFactory.make(
          { seriesUid: this.seriesUid },
          handler
        );

        console.time(`Transfering ${this.seriesUid}`);
        transferClient.beginTransfer();
      })();
    });
  }

  private createVolume(meta: DicomVolumeMetadata) {
    const volume = new DicomVolume(meta.voxelCount, meta.pixelFormat);
    volume.setVoxelSize(meta.voxelSize);
    if (meta.dicomWindow) volume.dicomWindow = meta.dicomWindow;
    if (meta.estimatedWindow) volume.estimatedWindow = meta.estimatedWindow;
    return volume;
  }

  public async loadVolume(): Promise<DicomVolume> {
    if (!this.meta) throw new Error('Medatadata not loaded yet');
    if (this.loadingVolumePromise) return await this.loadingVolumePromise;
    this.loadingVolumePromise = this._doLoadVolume();
    return await this.loadingVolumePromise;
  }

  public getVolume(): DicomVolume | null {
    return this.volume || null;
  }

  private createKey(suffix: string): string {
    const pvd = this.partialVolumeDescriptor;
    const pvdStr = pvd ? `:${pvd.start}:${pvd.end}:${pvd.delta}` : ':full';
    return this.seriesUid + pvdStr + '.' + suffix;
  }
}
