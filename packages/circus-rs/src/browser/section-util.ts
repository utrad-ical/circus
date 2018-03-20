import { Vector2D, Vector3D } from '../common/geometry';
import { Vector3, Vector2 } from 'three';
import {
  Section,
  Rectangle,
  translateSection,
  projectPointOntoSection
} from '../common/geometry';
import { fitRectangle } from '../common/geometry';

export type OrientationString = 'axial' | 'sagittal' | 'coronal' | 'oblique';

/**
 * Converts 3D point in volume coordinate space to 2D point in screen space using the given section.
 * @param section
 * @param resolution
 * @param volumePoint
 * @returns {Vector2}
 */
export function convertVolumeCoordinateToScreenCoordinate(
  section: Section,
  resolution: Vector2,
  volumePoint: Vector3
): Vector2 {
  const projection = projectPointOntoSection(section, volumePoint);
  return new Vector2(
    projection.x * resolution.x / section.xAxis.length(),
    projection.y * resolution.y / section.yAxis.length()
  );
}

/**
 * Converts 2D point in screen coordinate to 3D point in volume coordinate space.
 */
export function convertScreenCoordinateToVolumeCoordinate(
  section: Section,
  resolution: Vector2,
  screenPoint: Vector2
): Vector3 {
  return section.origin
    .clone()
    .add(section.xAxis.clone().multiplyScalar(screenPoint.x / resolution.x))
    .add(section.yAxis.clone().multiplyScalar(screenPoint.y / resolution.y));
}

/**
 * Investigates the section orientation and detects if the section
 * is (almost) orthogonal to one of the three axes.
 * @return One of 'axial', 'sagittal', 'coronal' or 'oblique'
 */
export function detectOrthogonalSection(section: Section): OrientationString {
  const xAxis = section.xAxis;
  const yAxis = section.yAxis;
  if (parallelToX(xAxis) && parallelToY(yAxis)) return 'axial';
  if (parallelToY(xAxis) && parallelToZ(yAxis)) return 'sagittal';
  if (parallelToX(xAxis) && parallelToZ(yAxis)) return 'coronal';
  return 'oblique';
}

const THRESHOLD = 0.0001;

export function parallelToX(vec: Vector3): boolean {
  const a = vec.angleTo(new Vector3(1, 0, 0));
  return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

export function parallelToY(vec: Vector3): boolean {
  const a = vec.angleTo(new Vector3(0, 1, 0));
  return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

export function parallelToZ(vec: Vector3): boolean {
  const a = vec.angleTo(new Vector3(0, 0, 1));
  return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

/**
 * Converts the given section from index-coordinate to mm-coordinate.
 * @param indexSection The section to convert.
 * @param voxelSize Millimeter per voxel.
 */
export function convertSectionToMm(
  indexSection: Section,
  voxelSize: Vector3
): Section {
  const mmSection: Section = {
    origin: convertPointToMm(indexSection.origin, voxelSize),
    xAxis: convertPointToMm(indexSection.xAxis, voxelSize),
    yAxis: convertPointToMm(indexSection.yAxis, voxelSize)
  };
  return mmSection;
}

/**
 * Converts the given section from mm-coordinate to index-coordinate
 * @param mmSection The section to convert.
 * @param voxelSize Millimeter per voxel.
 */
export function convertSectionToIndex(
  mmSection: Section,
  voxelSize: Vector3
): Section {
  const indexSection: Section = {
    origin: convertPointToIndex(mmSection.origin, voxelSize),
    xAxis: convertPointToIndex(mmSection.xAxis, voxelSize),
    yAxis: convertPointToIndex(mmSection.yAxis, voxelSize)
  };
  return indexSection;
}

export function convertPointToMm(
  indexPoint: Vector3,
  voxelSize: Vector3
): Vector3 {
  return indexPoint.clone().multiply(voxelSize);
}

export function convertPointToIndex(
  mmPoint: Vector3,
  voxelSize: Vector3
): Vector3 {
  return mmPoint.clone().divide(voxelSize);
}

/**
 * Performs a parallel translation orthogonal to the screen (aka paging).
 * The sliding amount is determined according to the current section orientation.
 * When the section seems to be orthogonal to one of the axes, this performs a
 * voxel-by-voxel sliding. Otherwise, the sliding is done by a millimeter resolution.
 */
export function orientationAwareTranslation(
  section: Section,
  voxelSize: Vector3D,
  step: number = 1
): Section {
  const orientation = detectOrthogonalSection(section);
  let delta: Vector3;
  switch (orientation) {
    case 'axial':
      delta = new Vector3(0, 0, voxelSize[2] * step);
      break;
    case 'sagittal':
      delta = new Vector3(voxelSize[0] * step, 0, 0);
      break;
    case 'coronal':
      delta = new Vector3(0, voxelSize[1] * step, 0);
      break;
    default:
      delta = section.xAxis
        .clone()
        .cross(section.yAxis)
        .normalize()
        .multiplyScalar(step);
      break;
  }
  section = translateSection(section, delta);
  return section;
}

/**
 * Calculates the scale factor relative to the screen pixel
 * @returns The calculated scale factor, where 1 = pixel by pixel, 2 = 200%, 0.5 = 50%
 */
export function calculateScaleFactor(
  section: Section,
  mmDim: Vector3D
): number {
  return mmDim[0] / section.xAxis.getComponent(0);
}

/**
 * Calculates the "fit-to-the-viewer" initial view state section.
 * @param resolution The target viewer size in screen pixels
 * @param volumeSize The target volume size in millimeters
 * @param orientation The orthogonal section
 * @param position The position in the axis orthogonal to the screen
 * @returns {Section}
 */
export function createOrthogonalMprSection(
  resolution: Vector2D,
  volumeSize: Vector3D,
  orientation: OrientationString = 'axial',
  position?: number
): Section {
  // const aspect = resolution[0] / resolution[1];
  let section: Section, rect: Rectangle, mmpp: Vector2D;
  switch (orientation) {
    case 'axial':
      if (typeof position === 'undefined') position = volumeSize[2] / 2;
      rect = fitRectangle(resolution, [volumeSize[0], volumeSize[1]]);
      mmpp = [volumeSize[0] / rect.size[0], volumeSize[1] / rect.size[1]];
      section = {
        origin: new Vector3(
          -rect.origin[0] * mmpp[0],
          -rect.origin[1] * mmpp[1],
          position
        ),
        xAxis: new Vector3(resolution[0] * mmpp[0], 0, 0),
        yAxis: new Vector3(0, resolution[1] * mmpp[1], 0)
      };
      break;
    case 'sagittal':
      if (typeof position === 'undefined') position = volumeSize[0] / 2;
      rect = fitRectangle(resolution, [volumeSize[1], volumeSize[2]]);
      mmpp = [volumeSize[1] / rect.size[0], volumeSize[2] / rect.size[1]];
      section = {
        origin: new Vector3(
          position,
          -rect.origin[0] * mmpp[0],
          -rect.origin[1] * mmpp[1]
        ),
        xAxis: new Vector3(0, resolution[0] * mmpp[0], 0),
        yAxis: new Vector3(0, 0, resolution[1] * mmpp[1])
      };
      break;
    case 'coronal':
      if (typeof position === 'undefined') position = volumeSize[1] / 2;
      rect = fitRectangle(resolution, [volumeSize[0], volumeSize[2]]);
      mmpp = [volumeSize[0] / rect.size[0], volumeSize[2] / rect.size[1]];
      section = {
        origin: new Vector3(
          -rect.origin[0] * mmpp[0],
          position,
          -rect.origin[1] * mmpp[1]
        ),
        xAxis: new Vector3(resolution[0] * mmpp[0], 0, 0),
        yAxis: new Vector3(0, 0, resolution[1] * mmpp[1])
      };
      break;
    default:
      throw new TypeError('Unsupported orientation');
  }
  return section;
}
