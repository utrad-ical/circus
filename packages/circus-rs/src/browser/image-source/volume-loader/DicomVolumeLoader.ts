import type DicomVolume from '../../../common/DicomVolume.ts';
import type { ViewWindow } from '../../../common/ViewWindow.ts';
import type { PixelFormat } from '@utrad-ical/circus-lib/src/PixelFormat';
import type { Initializer as MultiRangeInitializer } from 'multi-integer-range';
import type { EventEmitter } from 'events';
import type StrictEventEmitter from 'strict-event-emitter-types';

export interface DicomVolumeMetadata {
  dicomWindow?: ViewWindow;
  estimatedWindow?: ViewWindow;
  voxelCount: [number, number, number];
  voxelSize: [number, number, number];
  pixelFormat: PixelFormat;
  mode: '3d' | '2d';
}

export default interface DicomVolumeLoader {
  readonly loadController?: VolumeLoadController;
  loadMeta(): Promise<DicomVolumeMetadata>;
  loadVolume(): Promise<DicomVolume>;
}

interface ProgressInfo {
  target: DicomVolumeLoader;
  imageIndex: number;
  finished?: number;
  total?: number;
}
export type ProgressEventListener = (info: ProgressInfo) => void;

interface AbortInfo {
  target: DicomVolumeLoader;
}
export type AbortEventListener = (info: AbortInfo) => void;

interface ProgressEvents {
  progress: ProgressEventListener;
  abort: AbortEventListener;
}

export type ProgressEventEmitter = StrictEventEmitter<
  EventEmitter,
  ProgressEvents
>;

export interface VolumeLoadController extends ProgressEventEmitter {
  getVolume(): DicomVolume | null;
  setPriority(imageIndices: MultiRangeInitializer, priority: number): void;
  loadedImages(): number[];
  abort(): void;
  pause(): void;
  resume(): void;
}
