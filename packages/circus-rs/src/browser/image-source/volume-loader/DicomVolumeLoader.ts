import DicomVolume from '../../../common/DicomVolume';
import { ViewWindow } from '../../../common/ViewWindow';
import { PixelFormat } from '@utrad-ical/circus-lib/src/PixelFormat';
import { MultiRangeInitializer } from 'multi-integer-range';
import EventEmitter from 'events';
import StrictEventEmitter from 'strict-event-emitter-types';

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

interface ProgressInfo {
  target: DicomVolumeProgressiveLoader;
  imageIndex: number;
  finished?: number;
  total?: number;
}

interface ProgressEvents {
  progress: (info: ProgressInfo) => void;
}

export type ProgressEventEmitter = StrictEventEmitter<EventEmitter, ProgressEvents>;

export interface DicomVolumeProgressiveLoader extends ProgressEventEmitter {
  loadMeta(): Promise<DicomVolumeMetadata>;
  loadVolume(): Promise<DicomVolume>;
  getVolume(): DicomVolume | null;
  setPriority?(imageIndices: MultiRangeInitializer, priority: number): void;
}
