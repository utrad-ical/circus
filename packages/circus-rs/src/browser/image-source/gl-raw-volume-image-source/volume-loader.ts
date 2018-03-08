import DicomVolume from '../../../common/DicomVolume';
import { PixelFormat, pixelFormatInfo } from '../../../common/PixelFormat';
import { RsHttpClient } from '../../http-client/rs-http-client';

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

interface VolumeCache {
  put(key: string, content: any): Promise<void>;
  get(key: string): Promise<DicomVolume | DicomMetadata | any>;
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

  public loadMeta(): Promise<DicomMetadata> {
    return Promise.resolve(this.meta);
  }

  public loadVolume(): Promise<DicomVolume> {
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

    return Promise.resolve(volume);
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

  public loadMeta(): Promise<DicomMetadata> {
    return this.volumeLoader.loadMeta().then(meta => {
      this.meta = meta;
      return meta;
    });
  }

  public loadVolume(): Promise<DicomVolume> {
    return Promise.all([
      this.volumeLoader.loadVolume(),
      this.maskLoader.loadVolume()
    ]).then(([baseVolume, maskVolume]) => {
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
    });
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

  private cache: VolumeCache;

  private coef: number;
  
  constructor({ host, path, coef }: any) {
    this.client = new RsHttpClient(host);
    this.path = path;
	this.coef = coef || 1;
  }

  public useCache(cache: VolumeCache) {
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
          destUint16BufferArray[offset] = srcUint8BufferArray[offset] * this.coef;
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

  private cache: VolumeCache;

  constructor({ host, token, series }: any) {
    this.client = new RsHttpClient(host, token);
    this.series = series;
  }

  public useCache(cache: VolumeCache) {
    this.cache = cache;
  }

  public loadMeta(): Promise<DicomMetadata> {
    if (!this.series) return Promise.reject('Series is required');

    return (this.cache
      ? this.cache.get(this.series + '.meta')
      : Promise.resolve()
    )
      .then((meta?: DicomMetadata | null) => {
        return meta
          ? meta
          : this.client.request(`series/${this.series}/metadata`, {});
      })
      .then(meta => {
        this.meta = meta;

        if (this.cache) this.cache.put(this.series + '.meta', meta);

        return meta;
      });
  }

  public loadVolume(): Promise<DicomVolume> {
    if (!this.series) return Promise.reject('Series is required');

    return (this.cache
      ? this.cache.get(this.series + '.buffer')
      : Promise.resolve()
    )
      .then((volume?: DicomVolume | null) => {
        return volume
          ? volume
          : this.client.request(
              `series/${this.series}/volume`,
              {},
              'arraybuffer'
            );
      })
      .then(buffer => {
        const meta = this.meta;
        const volume = new DicomVolume(meta.voxelCount, meta.pixelFormat);
        volume.setVoxelSize(meta.voxelSize);
        if (meta.dicomWindow) volume.dicomWindow = meta.dicomWindow;
        if (meta.estimatedWindow) volume.estimatedWindow = meta.estimatedWindow;

        volume.assign(buffer);

        if (this.cache) this.cache.put(this.series + '.buffer', buffer);

        return volume;
      });
  }
}

/**
 * For Debug
 */
export class CacheIndexedDB implements VolumeCache {
  private connection;
  private queue: Promise<void>;

  private dbName;
  private storeName = 'cache';

  static detected: any;

  static detect() {
    if (!CacheIndexedDB.detected) {
      const w = window as any;

      const indexedDB =
        w.indexedDB || w.mozIndexedDB || w.webkitIndexedDB || w.msIndexedDB;
      // const IDBTransaction = w.IDBTransaction || w.webkitIDBTransaction || w.msIDBTransaction || {READ_WRITE: "readwrite"};
      // const IDBKeyRange = w.IDBKeyRange || w.webkitIDBKeyRange || w.msIDBKeyRange;

      if (!indexedDB)
        throw Error('IndexedDB is not supported on this browser.');

      CacheIndexedDB.detected = indexedDB;
    }
    return CacheIndexedDB.detected;
  }

  constructor(dbName: string = 'circus-rs-cache') {
    this.dbName = dbName;
    this.queue = Promise.resolve();
    this.open();
  }

  public open(): void {
    const openFunc = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const db = CacheIndexedDB.detect();
        const openRequest = db.open(this.dbName);

        openRequest.onerror = ev => {
          console.log('Error on open database');
          console.log(ev);
        };
        openRequest.onsuccess = ev => {
          this.connection = ev.target.result;
          // console.log('OPEND');
          resolve();
        };
        openRequest.onupgradeneeded = ev => {
          this.connection = ev.target.result;

          const store = this.connection.createObjectStore(this.storeName, {
            keyPath: 'key'
          });
          store.transaction.oncomplete = tranev => {
            // console.log('CREATED');
            resolve();
          };
        };
      });
    };

    this.queue = this.queue.then(openFunc);
  }

  public put(key: string, content: any): Promise<void> {
    const putFunc = () => {
      const store = this.connection
        .transaction(this.storeName, 'readwrite')
        .objectStore(this.storeName);
      store.put({
        key: key,
        content: content
      });
      // console.log('PUT');
    };

    this.queue = this.queue.then(putFunc);

    return this.queue;
  }

  public delete(key: string): Promise<void> {
    const deleteFunc = () => {
      const store = this.connection
        .transaction(this.storeName, 'readwrite')
        .objectStore(this.storeName);
      store.delete(key);
    };
    this.queue = this.queue.then(deleteFunc);

    return Promise.resolve();
  }

  public get(key: string): Promise<DicomVolume | DicomMetadata | any> {
    return new Promise((resolve, reject) => {
      this.queue.then(() => {
        const store = this.connection
          .transaction(this.storeName, 'readwrite')
          .objectStore(this.storeName);

        const request = store.get(key);
        request.onerror = ev => {
          resolve(undefined);
        };
        request.onsuccess = ev => {
          // console.log("GET: "+key);
          // console.log(request.result);
          resolve(request.result ? request.result.content : undefined);
        };
      });
    });
  }

  public drop() {
    this.queue = this.queue.then(() => {
      if (this.connection) this.connection.close();

      this.connection = null;

      const db = CacheIndexedDB.detect();

      const request = db.deleteDatabase(this.dbName);
      request.onerror = () => {
        console.log('Drop failed');
      };
      request.onsuccess = ev => {};
    });
  }
}
