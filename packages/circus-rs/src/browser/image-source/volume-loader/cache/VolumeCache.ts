import { DicomVolumeMetadata } from '../DicomVolumeLoader';

export default interface VolumeCache {
  getMetadata(seriesUid: string): Promise<DicomVolumeMetadata | undefined>;
  putMetadata(seriesUid: string, data: DicomVolumeMetadata): Promise<void>;
  getVolume(seriesUid: string): Promise<ArrayBuffer | undefined>;
  putVolume(seriesUid: string, data: ArrayBuffer): Promise<void>;
}

/**
 * Minimum "implementation" of VolumeCache that actually remembers nothing.
 */
export const nullVolumeCache: VolumeCache = {
  getMetadata: () => Promise.resolve(undefined),
  putMetadata: () => Promise.resolve(),
  getVolume: () => Promise.resolve(undefined),
  putVolume: () => Promise.resolve()
};
