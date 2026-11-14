import type DicomVolume from '../../../common/DicomVolume.ts';
import type { ViewWindow } from '../../../common/ViewWindow.ts';
import type { PixelFormat } from '../../../volume/PixelFormat.ts';
import type { RangeInput } from '../../../common/rangeInput.ts';
import type TypedEventTarget from '../../TypedEventTarget.ts';

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

export interface ProgressInfo {
  target: DicomVolumeLoader;
  imageIndex: number;
  finished?: number;
  total?: number;
}
export type ProgressEventListener = (event: CustomEvent<ProgressInfo>) => void;

export interface VolumeLoadControllerEventMap {
  progress: ProgressInfo;
  abort: { target: DicomVolumeLoader };
}

export interface VolumeLoadController extends TypedEventTarget<VolumeLoadControllerEventMap> {
  getVolume(): DicomVolume | null;
  setPriority(imageIndices: RangeInput, priority: number): void;
  loadedImages(): number[];
  abort(): void;
  pause(): void;
  resume(): void;
}
