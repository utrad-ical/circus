import { ImageSource } from './image-source/image-source';
import { Section } from '../common/geometry';
import { ViewWindow } from '../common/ViewWindow';

export type InterpolationMode =
  | 'trilinear'
  | 'nearestNeighbor'
  | 'vr-mask-custom';

export interface TransferFunctionEntry {
  color: string;
  position: number;
}

/**
 * ViewState determines how the ImageSource is viewed on each Viewer.
 */
export interface ViewState {
  section?: Section;
  window?: ViewWindow;
  interpolationMode?: InterpolationMode;

  // For volume rendering

  /**
   * Affects global alpha of each voxel.
   */
  rayIntensityCoef?: number; // [0.0; 1.0]

  /**
   * Zoom value.
   */
  zoom?: number;

  /**
   * Horizontal rotation of the camera measured in degree.
   */
  horizontal?: number;

  /**
   * Vertical rotation of the camera measured in degree.
   */
  vertical?: number;

  /**
   * Sub-volume
   */
  subVolume?: {
    offset: [number, number, number];
    dimension: [number, number, number];
  };

  transferFunction?: TransferFunctionEntry[];

  /**
   * If omitted, the default is the center of the (sub)volume,
   * which is the required behavior in almost all cases.
   */
  target?: [number, number, number];

  /**
   * Background fill color for outside of the volume boundary.
   */
  background?: [number, number, number, number];

  /**
   * Controls the rendering quality. Higher is better and slower.
   * The default value is 1.0.
   */
  quality?: number;
}
