import { DicomVolumeMetadata } from '../DicomVolumeLoader';

export default interface VolumeCache {
  getMetadata(key: string): Promise<DicomVolumeMetadata | undefined>;
  putMetadata(key: string, data: DicomVolumeMetadata): Promise<void>;
  getVolume(key: string): Promise<ArrayBuffer | undefined>;
  putVolume(key: string, data: ArrayBuffer): Promise<void>;
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
