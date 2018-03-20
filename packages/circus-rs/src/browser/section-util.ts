import { Vector2D, Vector3D } from '../common/geometry';
import { Vector3 } from 'three';
import { vec3 } from 'gl-matrix';
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
 * @param point
 * @returns {Vector2D}
 */
export function convertVolumeCoordinateToScreenCoordinate(
  section: Section,
  resolution: Vector2D,
  point: Vector3D
): Vector2D {
  const projection: Vector2D = projectPointOntoSection(
    section,
    new Vector3().fromArray(point)
  ).toArray() as Vector2D;
  return [
    projection[0] * resolution[0] / vec3.length(section.xAxis.toArray()),
    projection[1] * resolution[1] / vec3.length(section.yAxis.toArray())
  ];
}

/**
 * Converts 2D point in screen coordinate to 3D point in volume coordinate space.
 * @param section
 * @param resolution
 * @param p2
 * @returns {Vector3D}
 */
export function convertScreenCoordinateToVolumeCoordinate(
  section: Section,
  resolution: Vector2D,
  p2: Vector2D
): Vector3D {
  const p3 = section.origin.toArray();

  const xAxis = section.xAxis.toArray();
  const yAxis = section.yAxis.toArray();

  const xComponent = [
    p2[0] * (xAxis[0] / resolution[0]),
    p2[0] * (xAxis[1] / resolution[0]),
    p2[0] * (xAxis[2] / resolution[0])
  ];
  const yComponent = [
    p2[1] * (yAxis[0] / resolution[1]),
    p2[1] * (yAxis[1] / resolution[1]),
    p2[1] * (yAxis[2] / resolution[1])
  ];

  vec3.add(p3, p3, xComponent);
  vec3.add(p3, p3, yComponent);

  return p3 as Vector3D;
}

/**
 * Investigates the section orientation and detects if the section
 * is (almost) orthogonal to one of the three axes.
 * @return One of 'axial', 'sagittal', 'coronal' or 'oblique'
 */
export function detectOrthogonalSection(section: Section): OrientationString {
  const xAxis = section.xAxis.toArray() as Vector3D;
  const yAxis = section.yAxis.toArray() as Vector3D;
  if (parallelToX(xAxis) && parallelToY(yAxis)) return 'axial';
  if (parallelToY(xAxis) && parallelToZ(yAxis)) return 'sagittal';
  if (parallelToX(xAxis) && parallelToZ(yAxis)) return 'coronal';
  return 'oblique';
}

const THRESHOLD = 0.0001;

export function parallelToX(vec: Vector3D): boolean {
  const a = vec3.angle(vec, vec3.fromValues(1, 0, 0));
  return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

export function parallelToY(vec: Vector3D): boolean {
  const a = vec3.angle(vec, vec3.fromValues(0, 1, 0));
  return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

export function parallelToZ(vec: Vector3D): boolean {
  const a = vec3.angle(vec, vec3.fromValues(0, 0, 1));
  return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

/**
 * Converts the given section from index-coordinate to mm-coordinate.
 * @param indexSection The section to convert.
 * @param voxelSize Millimeter per voxel.
 */
export function convertSectionToMm(
  indexSection: Section,
  voxelSize: Vector3D
): Section {
  const mmSection: Section = {
    origin: convertPointToMm(
      indexSection.origin.toArray() as Vector3D,
      voxelSize
    ),
    xAxis: convertPointToMm(
      indexSection.xAxis.toArray() as Vector3D,
      voxelSize
    ),
    yAxis: convertPointToMm(indexSection.yAxis.toArray() as Vector3D, voxelSize)
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
  voxelSize: Vector3D
): Section {
  const indexSection: Section = {
    origin: convertPointToIndex(
      mmSection.origin.toArray() as Vector3D,
      voxelSize
    ),
    xAxis: convertPointToIndex(
      mmSection.xAxis.toArray() as Vector3D,
      voxelSize
    ),
    yAxis: convertPointToIndex(mmSection.yAxis.toArray() as Vector3D, voxelSize)
  };
  return indexSection;
}

export function convertPointToMm(
  indexPoint: Vector3D,
  voxelSize: Vector3D
): Vector3 {
  return new Vector3(
    indexPoint[0] * voxelSize[0],
    indexPoint[1] * voxelSize[1],
    indexPoint[2] * voxelSize[2]
  );
}

export function convertPointToIndex(
  mmPoint: Vector3D,
  voxelSize: Vector3D
): Vector3 {
  return new Vector3(
    mmPoint[0] / voxelSize[0],
    mmPoint[1] / voxelSize[1],
    mmPoint[2] / voxelSize[2]
  );
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
  let delta: Vector3D;
  switch (orientation) {
    case 'axial':
      delta = [0, 0, voxelSize[2] * step];
      break;
    case 'sagittal':
      delta = [voxelSize[0] * step, 0, 0];
      break;
    case 'coronal':
      delta = [0, voxelSize[1] * step, 0];
      break;
    default:
      delta = vec3.create() as Vector3D;
      vec3.cross(delta, section.xAxis.toArray(), section.yAxis.toArray());
      vec3.normalize(delta, delta);
      vec3.scale(delta, delta, step);
  }
  section = translateSection(section, new Vector3().fromArray(delta));
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
