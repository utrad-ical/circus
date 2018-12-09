import VolumeCache from './VolumeCache';
import { DicomVolumeMetadata } from '../DicomVolumeLoader';

/**
 * Provides a simple in-memory volume cache which is available only while the
 * browser window is open.
 */
export default class MemoryVolumeCache implements VolumeCache {
  private _metadata: Map<string, DicomVolumeMetadata>;
  private _volume: Map<string, ArrayBuffer>;

  constructor() {
    this._metadata = new Map();
    this._volume = new Map();
  }

  public async getMetadata(
    seriesUid: string
  ): Promise<DicomVolumeMetadata | undefined> {
    return this._metadata.get(seriesUid);
  }

  public async putMetadata(
    seriesUid: string,
    data: DicomVolumeMetadata
  ): Promise<void> {
    this._metadata.set(seriesUid, data);
  }

  public async getVolume(seriesUid: string): Promise<ArrayBuffer | undefined> {
    return this._volume.get(seriesUid);
  }

  public async putVolume(seriesUid: string, data: ArrayBuffer): Promise<void> {
    this._volume.set(seriesUid, data);
  }
}
