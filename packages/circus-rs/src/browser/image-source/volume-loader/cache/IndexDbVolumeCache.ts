import VolumeCache from './VolumeCache';
import IndexedDbCache from '../../../util/IndexedDbCache';
import { DicomVolumeMetadata } from '../DicomVolumeLoader';

/**
 * Volume Cache backed by IndexedDB, which means the volume will
 * be saved to the local browser storage permanently.
 */
export default class IndexedDbVolumeCache implements VolumeCache {
  private _db: IndexedDbCache<ArrayBuffer | DicomVolumeMetadata>;

  constructor(dbName: string) {
    this._db = new IndexedDbCache(dbName);
  }

  public async getMetadata(
    seriesUid: string
  ): Promise<DicomVolumeMetadata | undefined> {
    const key = `${seriesUid}.meta`;
    return await (this._db.get(key) as Promise<DicomVolumeMetadata>);
  }

  public async putMetadata(
    seriesUid: string,
    data: DicomVolumeMetadata
  ): Promise<void> {
    const key = `${seriesUid}.meta`;
    await this._db.put(key, data);
  }

  public async getVolume(seriesUid: string): Promise<ArrayBuffer | undefined> {
    const key = `${seriesUid}.buffer`;
    return await (this._db.get(key) as Promise<ArrayBuffer>);
  }

  public async putVolume(seriesUid: string, data: ArrayBuffer): Promise<void> {
    const key = `${seriesUid}.buffer`;
    console.log('🍣', key);
    await this._db.put(key, data);
  }
}
