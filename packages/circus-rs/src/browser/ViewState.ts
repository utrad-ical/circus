import { Section } from '../common/geometry';
import { ViewWindow } from '../common/ViewWindow';

interface SectionDrawingViewState {
  readonly section: Section;
}

export interface MprViewState extends SectionDrawingViewState {
  readonly type: 'mpr';
  readonly window: ViewWindow;
  readonly interpolationMode?: InterpolationMode;
}

export interface VrViewState extends SectionDrawingViewState {
  readonly type: 'vr';

  /**
   * Sub-volume
   */
  readonly subVolume?: SubVolume;

  /**
   * Controls the rendering quality. Higher is better and slower.
   * The default value is 2.0. (Get value 2 times per ray step)
   */
  readonly quality?: number;

  /**
   * Penetration of ray.
   * As you set higher, refer to deeper voxels.
   * [0.0; 1.0]
   */
  readonly rayIntensity?: number;

  /**
   * Define color of each voxel value via "transfer function".
   */
  readonly transferFunction?: TransferFunction;

  /**
   * Background fill color(RGBA) for outside of the volume boundary.
   * Each element range is 0-255.
   */
  readonly background?: [number, number, number, number];

  /**
   * Enable mask (ex. blood vessel extraction).
   */
  readonly enableMask?: boolean;

  /**
   * Highlighted label index from 0. Undefined(or "-1") means disabled.
   */
  readonly highlightedLabelIndex?: number;

  readonly interpolationMode?: InterpolationMode;

  /**
   * For Debugging
   * 0: disabled
   * 1: draw only volume box
   * 2: draw vr and volume box
   */
  readonly debugMode?: number;
}

/**
 * Supports interporation.
 * trilinear: multivariate interpolation on a 3-dimensional regular grid.
 * nearestNeighbor: disable interporation(use nearest neighbor search).
 */
export type InterpolationMode = 'trilinear' | 'nearestNeighbor';

/**
 * Transfer function defines each voxel color.
 * This is defined as array of TransferFunctionEntry.
 * "position" of the first item must be 0 and last one must be 1.
 * Colors between entries are linearly interpolated.
 */
export type TransferFunction = Array<TransferFunctionEntry>;

/**
 * To map voxel value to color.
 * "position" range is 0.0 to 1.0.
 * Map voxel values (-32,768 to 32,768) to it.
 * ex) position is 0.5 if value is 0.
 */
interface TransferFunctionEntry {
  readonly position: number;
  readonly color: string;
}

export interface SubVolume {
  readonly offset: [number, number, number];
  readonly dimension: [number, number, number];
}

/**
 * ViewState determines how an ImageSource is displayed on each Viewer.
 * This is an immutable object whose identity can be checked using `===`.
 */
type ViewState = MprViewState | VrViewState;

// eslint-disable-next-line no-undef
export default ViewState;
