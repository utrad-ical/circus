import DicomVolume from '../../../common/DicomVolume';
import { ViewWindow } from '../../../common/ViewWindow';
import { PixelFormat } from '@utrad-ical/circus-lib/src/PixelFormat';

export interface DicomVolumeMetadata {
  dicomWindow?: ViewWindow;
  estimatedWindow?: ViewWindow;
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  pixelFormat: PixelFormat;
}

export default interface DicomVolumeLoader {
  loadMeta(): Promise<DicomVolumeMetadata>;
  loadVolume(): Promise<DicomVolume>;
}
