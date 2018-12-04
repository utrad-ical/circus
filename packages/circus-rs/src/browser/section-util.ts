import { Box3, ShapeUtils, Triangle, Vector2, Vector3, Box2 } from 'three';
import {
  fitRectangle,
  intersectionOfBoxAndPlane,
  projectPointOntoSection,
  Section,
  translateSection,
  Vector2D,
  Vector3D,
  vectorizeSection
} from '../common/geometry';

export type OrientationString = 'axial' | 'sagittal' | 'coronal' | 'oblique';

/**
 * Converts 3D point in volume coordinate space to 2D point in screen space
 * using the given section.
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
  const vSection = vectorizeSection(section);
  const projection = projectPointOntoSection(section, volumePoint);
  return new Vector2(
    projection.x * resolution.x / vSection.xAxis.length(),
    projection.y * resolution.y / vSection.yAxis.length()
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
  const vSection = vectorizeSection(section);
  return vSection.origin
    .add(vSection.xAxis.multiplyScalar(screenPoint.x / resolution.x))
    .add(vSection.yAxis.multiplyScalar(screenPoint.y / resolution.y));
}

/**
 * Investigates the section orientation and detects if the section
 * is (almost) orthogonal to one of the three axes.
 * @return One of 'axial', 'sagittal', 'coronal' or 'oblique'
 */
export function detectOrthogonalSection(section: Section): OrientationString {
  const xAxis = new Vector3().fromArray(section.xAxis);
  const yAxis = new Vector3().fromArray(section.yAxis);
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
  const vSection = vectorizeSection(indexSection);
  const mmSection: Section = {
    origin: convertPointToMm(vSection.origin, voxelSize).toArray(),
    xAxis: convertPointToMm(vSection.xAxis, voxelSize).toArray(),
    yAxis: convertPointToMm(vSection.yAxis, voxelSize).toArray()
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
  const vSection = vectorizeSection(mmSection);
  const indexSection: Section = {
    origin: convertPointToIndex(vSection.origin, voxelSize).toArray(),
    xAxis: convertPointToIndex(vSection.xAxis, voxelSize).toArray(),
    yAxis: convertPointToIndex(vSection.yAxis, voxelSize).toArray()
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
      delta = new Vector3()
        .fromArray(section.xAxis)
        .cross(new Vector3().fromArray(section.yAxis))
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
export function calculateScaleFactor(section: Section, mmDim: Vector3): number {
  return mmDim.x / section.xAxis[0];
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
  const res = new Vector2().fromArray(resolution);
  const vs = new Vector3().fromArray(volumeSize);
  let section: Section;
  switch (orientation) {
    case 'axial': {
      if (typeof position === 'undefined') position = vs.z / 2;
      const rect = fitRectangle(res, new Vector2(vs.x, vs.y));
      const size = rect.getSize(new Vector2());
      const mmpp = [vs.x / size.x, vs.y / size.y];
      section = {
        origin: [-rect.min.x * mmpp[0], -rect.min.y * mmpp[1], position],
        xAxis: [res.x * mmpp[0], 0, 0],
        yAxis: [0, res.y * mmpp[1], 0]
      };
      break;
    }
    case 'sagittal': {
      if (typeof position === 'undefined') position = vs.x / 2;
      const rect = fitRectangle(res, new Vector2(vs.y, vs.z));
      const size = rect.getSize(new Vector2());
      const mmpp = [vs.y / size.x, vs.z / size.y];
      section = {
        origin: [position, -rect.min.x * mmpp[0], -rect.min.y * mmpp[1]],
        xAxis: [0, res.x * mmpp[0], 0],
        yAxis: [0, 0, res.y * mmpp[1]]
      };
      break;
    }
    case 'coronal': {
      if (typeof position === 'undefined') position = vs.y / 2;
      const rect = fitRectangle(res, new Vector2(vs.x, vs.z));
      const size = rect.getSize(new Vector2());
      const mmpp = [vs.x / size.x, vs.z / size.y];
      section = {
        origin: [-rect.min.x * mmpp[0], position, -rect.min.y * mmpp[1]],
        xAxis: [res.x * mmpp[0], 0, 0],
        yAxis: [0, 0, res.y * mmpp[1]]
      };
      break;
    }
    default:
      throw new TypeError('Unsupported orientation');
  }
  return section;
}

/**
 * Calculates the "fit-to-the-viewer" state section on resized.
 *
 * @param section
 * @param oldResolution
 * @param newResolution
 * @returns {Section}
 */
export function adjustOnResized(
  section: Section,
  oldResolution: Vector2D,
  newResolution: Vector2D
): Section {
  const oldResolutionVec: Vector2 = new Vector2().fromArray(oldResolution);
  const newResolutionVec: Vector2 = new Vector2().fromArray(newResolution);

  if (
    (oldResolutionVec.x === newResolutionVec.x &&
      oldResolutionVec.y === newResolutionVec.y) ||
    oldResolutionVec.x === 0 ||
    oldResolutionVec.y === 0 ||
    newResolutionVec.x === 0 ||
    newResolutionVec.y === 0
  )
    return section;

  const newOrigin = convertScreenCoordinateToVolumeCoordinate(
    section,
    oldResolutionVec,
    newResolutionVec
      .clone()
      .sub(oldResolutionVec)
      .multiplyScalar(-0.5)
  );

  const newXAxis = new Vector3()
    .fromArray(section.xAxis)
    .multiplyScalar(newResolutionVec.x / oldResolutionVec.x);

  const newYAxis = new Vector3()
    .fromArray(section.yAxis)
    .multiplyScalar(newResolutionVec.y / oldResolutionVec.y);

  const newSection: Section = {
    origin: newOrigin.toArray(),
    xAxis: newXAxis.toArray(),
    yAxis: newYAxis.toArray()
  };

  return newSection;
}

/**
 * Returns true if the given section overlaps the volume.
 * @param mmSection The section in millimeters
 * @param resolution The viewer size in screen pixels
 * @param volumeSize The volume size in millimeters
 * @param voxelCount The voxel count
 */
export function sectionOverlapsVolume(
  mmSection: Section,
  resolution: Vector2,
  voxelSize: Vector3,
  voxelCount: Vector3
): boolean {
  // Create the volume box (cuboid)
  const mmVolume: Box3 = new Box3(
    convertPointToMm(new Vector3(0, 0, 0), voxelSize),
    convertPointToMm(voxelCount, voxelSize)
  );

  // Calculates the intersection of the volume box (cuboid) and the section treated as a plane that extends infinitely.
  const intersections = intersectionOfBoxAndPlane(mmVolume, mmSection);

  // If there is no intersection point, the section is outside the volume.
  if (!intersections) return false;

  // Calculates the vertex of the section treated as a finitely area.
  // (v0)+-----+(v1)
  //     |     |
  //     |     |
  // (v3)+-----+(v2)
  const mmSectionVec = vectorizeSection(mmSection);
  const sectionVertices: [Vector3, Vector3, Vector3, Vector3] = [
    mmSectionVec.origin,
    new Vector3().add(mmSectionVec.origin).add(mmSectionVec.xAxis),
    new Vector3()
      .add(mmSectionVec.origin)
      .add(mmSectionVec.xAxis)
      .add(mmSectionVec.yAxis),
    new Vector3().add(mmSectionVec.origin).add(mmSectionVec.yAxis)
  ];

  // Create the section box (rectangle)
  const mmSectionBox2: Box2 = new Box2(
    convertVolumeCoordinateToScreenCoordinate(
      mmSection,
      resolution,
      sectionVertices[0]
    ),
    convertVolumeCoordinateToScreenCoordinate(
      mmSection,
      resolution,
      sectionVertices[2]
    )
  );

  // Convert intersection coordinates from volume 3D coordinate to screen 2D coordinate in millimeter.
  const shadowPolygonVerticeCoords: Vector2[] = intersections.map(p3 =>
    convertVolumeCoordinateToScreenCoordinate(mmSection, resolution, p3)
  );

  // If the section contains an intersection point, the section overlaps the volume.
  if (shadowPolygonVerticeCoords.some(p2 => mmSectionBox2.containsPoint(p2)))
    return true;

  // Create a polygon whose vertices are intersections.
  // If the polygon contains a vertex of the section, the section overlaps the volume.
  // In order to determine this, divide the polygon into triangles and use it.(because to using Three.js)
  type VertexIndex = number;
  type ShadowTriangle = [VertexIndex, VertexIndex, VertexIndex];
  const shadowTriangles: ShadowTriangle[] = ShapeUtils.triangulateShape(
    shadowPolygonVerticeCoords,
    []
  ) as any;
  const shadowPolygonVertices: Vector3[] = shadowPolygonVerticeCoords.map(
    coord =>
      convertScreenCoordinateToVolumeCoordinate(mmSection, resolution, coord)
  );
  return shadowTriangles.some(([vIdx1, vIdx2, vIdx3]) => {
    const triangle = new Triangle().set(
      shadowPolygonVertices[vIdx1],
      shadowPolygonVertices[vIdx2],
      shadowPolygonVertices[vIdx3]
    );
    return sectionVertices.some(p => triangle.containsPoint(p));
  });
}
