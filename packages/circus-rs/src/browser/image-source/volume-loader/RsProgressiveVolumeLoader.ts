import RsHttpClient from '../../http-client/RsHttpClient';
import { DicomVolumeProgressiveLoader, ProgressEventEmitter } from './DicomVolumeLoader';
import DicomVolume from '../../../common/DicomVolume';
import { DicomVolumeMetadata } from './DicomVolumeLoader';
import PartialVolumeDescriptor, {
  isValidPartialVolumeDescriptor, partialVolumeDescriptorToArray
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import VolumeCache, { nullVolumeCache } from './cache/VolumeCache';
import { EstimateWindowType, createRequestParams } from './rs-loader-utils';
import { TransferConnection, TransferConnectionFactory } from '../../ws/createTransferConnectionFactory';
import MultiRange, { MultiRangeInitializer } from 'multi-integer-range';
import EventEmitter from 'events';
import setImmediate from '../../util/setImmediate';

interface RsProgressiveVolumeLoaderOptions {
  rsHttpClient: RsHttpClient;
  seriesUid: string;
  partialVolumeDescriptor?: PartialVolumeDescriptor;
  cache?: VolumeCache;
  estimateWindowType?: EstimateWindowType;
  transferConnectionFactory: TransferConnectionFactory;
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
  private transferConnectionFactory: TransferConnectionFactory;
  private transferConnection?: TransferConnection;
  private connected: Promise<void>;
  private resolveConnected?: (value: void | PromiseLike<void>) => void;

  constructor({
    rsHttpClient,
    seriesUid,
    partialVolumeDescriptor,
    cache,
    estimateWindowType = 'none',
    transferConnectionFactory
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
    this.transferConnectionFactory = transferConnectionFactory;
    this.connected = new Promise<void>((resolve) => this.resolveConnected = resolve);
  }

  public setPriority(imageIndices: MultiRangeInitializer, priority: number): void {
    this.connected.then(() => this.transferConnection?.setPriority(new MultiRange(imageIndices).toArray(), priority));
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
    if (!this.volume) this.volume = this.createVolume(this.meta, this.partialVolumeDescriptor);

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
      const stored = new Set<number>();

      const handler = (imageIndex: number, buffer: ArrayBuffer) => {
        volume.insertSingleImage(imageIndex, buffer);
        stored.add(imageIndex);

        const finished = stored.size;
        const total = meta.voxelCount[2];

        if (finished === total) {
          console.timeEnd(`Transfering ${this.seriesUid}`);
          console.log('Complete!');
          setImmediate(() => resolve());
        }

        this.emit('progress', { target: this, imageIndex, finished, total });
      };

      console.time(`Transfering ${this.seriesUid}`);
      this.transferConnection = this.transferConnectionFactory(
        {
          seriesUid: this.seriesUid,
          partialVolumeDescriptor: this.partialVolumeDescriptor
        },
        handler
      );
      this.resolveConnected && this.resolveConnected();
    });
  }

  private createVolume(meta: DicomVolumeMetadata, partialVolumeDescriptor?: PartialVolumeDescriptor) {
    const voxelCount: typeof meta.voxelCount = partialVolumeDescriptor
      ? [
        meta.voxelCount[0],
        meta.voxelCount[1],
        partialVolumeDescriptorToArray(partialVolumeDescriptor).length
      ]
      : meta.voxelCount;
    const volume = new DicomVolume(voxelCount, meta.pixelFormat);
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
    if (!this.meta) return null;
    if (!this.volume) this.volume = this.createVolume(this.meta, this.partialVolumeDescriptor);

    return this.volume;
  }

  private createKey(suffix: string): string {
    const pvd = this.partialVolumeDescriptor;
    const pvdStr = pvd ? `:${pvd.start}:${pvd.end}:${pvd.delta}` : ':full';
    return this.seriesUid + pvdStr + '.' + suffix;
  }
}
