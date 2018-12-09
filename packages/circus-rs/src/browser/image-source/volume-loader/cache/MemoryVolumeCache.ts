import VolumeCache from './VolumeCache';
import { DicomVolumeMetadata } from '../DicomVolumeLoader';

/**
 * Provides a simple in-memory volume cache which is available only while the
 * browser window is open.
 * The created cache will be injected to `RsVolumeLoader`.
 */
export default class MemoryVolumeCache implements VolumeCache {
  private _metadata: Map<string, DicomVolumeMetadata>;
  private _volume: Map<string, ArrayBuffer>;

  constructor() {
    this._metadata = new Map();
    this._volume = new Map();
  }

  public async getMetadata(
    key: string
  ): Promise<DicomVolumeMetadata | undefined> {
    return this._metadata.get(key);
  }

  public async putMetadata(
    key: string,
    data: DicomVolumeMetadata
  ): Promise<void> {
    await this._metadata.set(key, data);
  }

  public async getVolume(key: string): Promise<ArrayBuffer | undefined> {
    return this._volume.get(key);
  }

  public async putVolume(key: string, data: ArrayBuffer): Promise<void> {
    await this._volume.set(key, data);
  }
}
