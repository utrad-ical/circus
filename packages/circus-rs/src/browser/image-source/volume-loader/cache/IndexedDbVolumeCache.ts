import VolumeCache from './VolumeCache';
import IndexedDbCache from '../../../util/IndexedDbCache';
import { DicomVolumeMetadata } from '../DicomVolumeLoader';

/**
 * Volume Cache backed by IndexedDB, which means the cache data will be
 * saved to the local browser storage permanently.
 * The created cache will be injected to `RsVolumeLoader`.
 */
export default class IndexedDbVolumeCache implements VolumeCache {
  private _db: IndexedDbCache<ArrayBuffer | DicomVolumeMetadata>;

  constructor(dbName: string) {
    this._db = new IndexedDbCache(dbName);
  }

  public async getMetadata(
    key: string
  ): Promise<DicomVolumeMetadata | undefined> {
    return await (this._db.get(key) as Promise<DicomVolumeMetadata>);
  }

  public async putMetadata(
    key: string,
    data: DicomVolumeMetadata
  ): Promise<void> {
    await this._db.put(key, data);
  }

  public async getVolume(key: string): Promise<ArrayBuffer | undefined> {
    return await (this._db.get(key) as Promise<ArrayBuffer>);
  }

  public async putVolume(key: string, data: ArrayBuffer): Promise<void> {
    await this._db.put(key, data);
  }
}
