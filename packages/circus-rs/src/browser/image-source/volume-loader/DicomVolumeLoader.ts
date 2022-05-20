import DicomVolume from '../../../common/DicomVolume';
import { ViewWindow } from '../../../common/ViewWindow';
import { PixelFormat } from '@utrad-ical/circus-lib/src/PixelFormat';
import MultiRange, { MultiRangeInitializer } from 'multi-integer-range';

export interface DicomVolumeMetadata {
  dicomWindow?: ViewWindow;
  estimatedWindow?: ViewWindow;
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  pixelFormat: PixelFormat;
  mode: '3d' | '2d';
}

export default interface DicomVolumeLoader {
  loadMeta(): Promise<DicomVolumeMetadata>;
  loadVolume(): Promise<DicomVolume>;
}

type MultiRangeDescriptor = Exclude<MultiRangeInitializer, MultiRange>;
interface ProgressEvent {
  target: DicomVolumeProgressiveLoader;
  type: 'progress';
  count: number;
  total: number;
}

export type ProgressListener = (ev: ProgressEvent) => void;

export interface DicomVolumeProgressiveLoader {
  loadMeta(): Promise<DicomVolumeMetadata>;
  loadVolume(): Promise<DicomVolume>;
  getVolume(): DicomVolume | null;
  setPriority(images: MultiRangeDescriptor, priority: number): void;
  addProgressListener(type: 'progress', listener: ProgressListener): void;
}
