import DicomVolume from '../../../common/DicomVolume';
import { PixelFormat, pixelFormatInfo } from '../../../common/PixelFormat';
import { RsHttpClient } from '../../http-client/rs-http-client';
import IndexedDbCache from '../../util/IndexedDbCache';

export interface DicomVolumeLoader {
  loadMeta(): Promise<DicomMetadata>;
  loadVolume(): Promise<DicomVolume>;
}

interface DicomMetadata {
  dicomWindow?: {
    level: number;
    width: number;
  };
  estimatedWindow?: {
    level: number;
    width: number;
  };
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  pixelFormat: number;
}

export class MockLoader implements DicomVolumeLoader {
  private option: any = {};
  private meta: DicomMetadata;

  constructor(option: any = {}) {
    this.option = option;

    const meta = option.meta || {
      voxelSize: [0.4688, 0.4688, 0.6],
      voxelCount: [512, 512, 132],
      estimatedWindow: {
        level: 200,
        width: 600
      },
      pixelFormat: PixelFormat.UInt16
    };

    this.meta = meta;
  }

  public async loadMeta(): Promise<DicomMetadata> {
    return this.meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    const option = this.option;

    const meta = this.meta;
    const gridSize = option.gridSize || 50;

    const [width, height, depth] = meta.voxelCount;
    const pixelFormat = meta.pixelFormat as PixelFormat;

    const volume = new DicomVolume([width, height, depth], pixelFormat);
    volume.setVoxelSize(meta.voxelSize);
    if (meta.estimatedWindow)
      volume.estimatedWindow = { ...meta.estimatedWindow };

    const createValue = (x, y, z) => {
      let val =
        Math.floor(x / gridSize) +
        Math.floor(y / gridSize) +
        Math.floor(z / gridSize);
      if (pixelFormat === PixelFormat.Binary) {
        val %= 2;
      } else {
        val = (val % 3) * 30;
      }
      return val;
    };
    volume.fillAll(createValue);
    for (let z = 0; z < depth; z++) {
      volume.markSliceAsLoaded(z);
    }

    return volume;
  }
}

export class MixLoaderSample implements DicomVolumeLoader {
  private volumeLoader: DicomVolumeLoader;
  private maskLoader: DicomVolumeLoader;
  private meta: DicomMetadata;

  constructor({ volumeLoader, maskLoader }) {
    this.volumeLoader = volumeLoader;
    this.maskLoader = maskLoader;
  }

  public async loadMeta(): Promise<DicomMetadata> {
    const meta = await this.volumeLoader.loadMeta();
    this.meta = meta;
    return meta;
  }

  public async loadVolume(): Promise<DicomVolume> {
    const [baseVolume, maskVolume] = await Promise.all([
      this.volumeLoader.loadVolume(),
      this.maskLoader.loadVolume()
    ]);
    const meta = this.meta;
    const [width, height, depth] = meta.voxelCount;
    const pixelFormat = meta.pixelFormat as PixelFormat;

    const volume = new DicomVolume([width, height, depth], pixelFormat);
    volume.setVoxelSize(meta.voxelSize);
    if (meta.estimatedWindow)
      volume.estimatedWindow = { ...meta.estimatedWindow };

    volume.fillAll((x, y, z) => {
      const val = baseVolume.getPixelAt(x, y, z);
      const mask = maskVolume.getPixelAt(x, y, z);
      // const val = mask ? 658 : 0;

      switch (mask) {
        case 1:
          return Math.min(val, 32767);
        case 2:
          return Math.min(val, 32767) + 32768;
        default:
          return 0;
      }
    });
    for (let z = 0; z < depth; z++) {
      volume.markSliceAsLoaded(z);
    }

    return volume;
  }
}

export class VesselSampleLoader implements DicomVolumeLoader {
  // [Note]
  // const sampleHost: string = window.location.protocol+'//'
  // + window.location.server+''
  // + ( window.location.port && window.location.port != 80 ? ':'+window.location.port );
  // const samplePath: string = 'vessel_mask.raw';

  // const loader = new VesselSampleLoader({
  // 'host': sampleHost,
  // 'path': samplePath
  // })

  // ObjectType = Image
  // NDims = 3
  // DimSize = 512 512 132
  // ElementType = MET_UCHAR
  // ElementSpacing = 0.468800 0.468800 0.600000
  // ElementByteOrderMSB = False
  // ElementDataFile = vessel_mask.raw

  private client: RsHttpClient;
  private path: string;
  private meta: DicomMetadata = {
    voxelSize: [0.4688, 0.4688, 0.6],
    voxelCount: [512, 512, 132],
    pixelFormat: PixelFormat.UInt16,
    dicomWindow: { level: 200, width: 600 },
    estimatedWindow: { level: 200, width: 600 }
  };

  private cache: IndexedDbCache<any>;

  private coef: number;

  constructor({ host, path, coef }: any) {
    this.client = new RsHttpClient(host);
    this.path = path;
    this.coef = coef || 1;
  }

  public useCache(cache: IndexedDbCache<any>): void {
    this.cache = cache;
  }

  public loadMeta(): Promise<DicomMetadata> {
    return Promise.resolve(this.meta);
  }

  public loadVolume(): Promise<DicomVolume> {
    return (this.cache
      ? this.cache.get(this.path + '.static')
      : Promise.resolve()
    )
      .then((volume?: DicomVolume | null) => {
        return volume
          ? volume
          : this.client.request(this.path, {}, 'arraybuffer');
      })
      .then(buffer => {
        const meta = this.meta;
        const volume = new DicomVolume(meta.voxelCount, PixelFormat.UInt16);
        volume.setVoxelSize(meta.voxelSize);
        if (meta.dicomWindow) volume.dicomWindow = meta.dicomWindow;
        if (meta.estimatedWindow) volume.estimatedWindow = meta.estimatedWindow;

        const bufferSize =
          meta.voxelCount[0] * meta.voxelCount[1] * meta.voxelCount[2];
        const srcUint8BufferArray = new Uint8Array(buffer);

        const destUint16BufferArray = new Uint16Array(bufferSize);

        for (let offset = 0; offset < bufferSize; offset++) {
          // destUint16BufferArray[offset] = srcUint8BufferArray[offset];
          destUint16BufferArray[offset] =
            srcUint8BufferArray[offset] * this.coef;
        }

        volume.assign((destUint16BufferArray as any).buffer);

        if (this.cache) this.cache.put(this.path + '.static', buffer);

        return volume;
      });
  }
}

export class RsVolumeLoader implements DicomVolumeLoader {
  private client: RsHttpClient;
  private series: string;
  private meta: DicomMetadata;

  private cache: IndexedDbCache<ArrayBuffer | DicomMetadata>;

  constructor({ host, token, series }: any) {
    this.client = new RsHttpClient(host, token);
    this.series = series;
  }

  public useCache(cache: IndexedDbCache<ArrayBuffer | DicomMetadata>): void {
    this.cache = cache;
  }

  public async loadMeta(): Promise<DicomMetadata> {
    if (!this.series) throw new Error('Series is required');

    let meta: DicomMetadata | undefined;
    if (this.cache) {
      const cache = <Promise<DicomMetadata>>this.cache.get(
        this.series + '.meta'
      );
      if (cache) meta = await cache;
    }
    if (!meta) {
      meta = (await this.client.request(
        `series/${this.series}/metadata`,
        {}
      )) as DicomMetadata;
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
