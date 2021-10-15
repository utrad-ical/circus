import { Box3, Vector2 } from 'three';
import { getSectionDrawingViewState } from '../..';
import {
  convertScreenCoordinateToVolumeCoordinate,
  detectOrthogonalSection
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import Cuboid from '../Cuboid';
import Ellipsoid from '../Ellipsoid';
import PlaneFigure, { FigureType as PlaneFigureType } from '../PlaneFigure';
import Point from '../Point';
import Ruler from '../Ruler';
import SolidFigure, {
  FigureType as SolidFigureType,
  getSolidFigureBoundingBoxWithResetDepth
} from '../SolidFigure';

interface CreateDefaultSolidFigureFromViewerOption {
  type?: SolidFigureType;
  sizeRatio?: number;
}
export function createDefaultSolidFigureFromViewer(
  viewer: Viewer | undefined,
  {
    type = 'cuboid',
    sizeRatio = 0.25
  }: CreateDefaultSolidFigureFromViewerOption
): SolidFigure {
  const anno = type === 'cuboid' ? new Cuboid() : new Ellipsoid();

  if (!viewer) return anno;
  const viewState = viewer.getState();
  if (viewState.type === '2d') throw new Error('Unsupported view state.');

  const section = getSectionDrawingViewState(viewState);
  const orientation = detectOrthogonalSection(section);

  const resolution = new Vector2().fromArray(viewer.getResolution());

  const halfLength = Math.min(resolution.x, resolution.y) * 0.5 * sizeRatio;

  const screenCenter = new Vector2().fromArray([
    resolution.x * 0.5,
    resolution.y * 0.5
  ]);

  const min = convertScreenCoordinateToVolumeCoordinate(
    section,
    resolution,
    new Vector2().fromArray([
      screenCenter.x - halfLength,
      screenCenter.y - halfLength
    ])
  );

  const max = convertScreenCoordinateToVolumeCoordinate(
    section,
    resolution,
    new Vector2().fromArray([
      screenCenter.x + halfLength,
      screenCenter.y + halfLength
    ])
  );

  const boundingBox = getSolidFigureBoundingBoxWithResetDepth(
    orientation,
    new Box3().expandByPoint(min).expandByPoint(max)
  );

  anno.min = [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z];
  anno.max = [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z];
  return anno;
}

interface CreateDefaultPlaneFigureFromViewerOption {
  type?: PlaneFigureType;
  sizeRatio?: number;
}
export function createDefaultPlaneFigureFromViewer(
  viewer: Viewer | undefined,
  {
    type = 'circle',
    sizeRatio = 0.25
  }: CreateDefaultPlaneFigureFromViewerOption
): PlaneFigure {
  const anno = new PlaneFigure();

  if (!viewer) return anno;
  const viewState = viewer.getState();
  const section = getSectionDrawingViewState(viewState);
  const orientation = detectOrthogonalSection(section);
  if (orientation !== 'axial') return anno;

  const { origin, xAxis, yAxis } = section;
  const center = [
    origin[0] + (xAxis[0] + yAxis[0]) * 0.5,
    origin[1] + (xAxis[1] + yAxis[1]) * 0.5,
    origin[2] + (xAxis[2] + yAxis[2]) * 0.5
  ];
  const dist = Math.min(xAxis[0], yAxis[1]) * 0.5 * sizeRatio;

  anno.type = type;
  anno.min = [center[0] - dist, center[1] - dist];
  anno.max = [center[0] + dist, center[1] + dist];
  anno.z = origin[2];

  return anno;
}

interface CreateDefaultPointFromViewerOption {
  radius?: number;
}
export function createDefaultPointFromViewer(
  viewer: Viewer | undefined,
  { radius = undefined }: CreateDefaultPointFromViewerOption
): Point {
  const anno = new Point();

  if (!viewer) return anno;
  const viewState = viewer.getState();
  const section = getSectionDrawingViewState(viewState);

  const resolution = new Vector2().fromArray(viewer.getResolution());
  const screenCenter = new Vector2().fromArray([
    resolution.x * 0.5,
    resolution.y * 0.5
  ]);
  const centerPoint = convertScreenCoordinateToVolumeCoordinate(
    section,
    resolution,
    new Vector2().fromArray([screenCenter.x, screenCenter.y])
  );
  if (radius && radius > 0) anno.radius = radius;
  anno.location = [centerPoint.x, centerPoint.y, centerPoint.z];
  return anno;
}

interface CreateDefaultRulerFromViewerOption {
  sizeRatio?: number;
}
export function createDefaultRulerFromViewer(
  viewer: Viewer | undefined,
  { sizeRatio = 0.25 }: CreateDefaultRulerFromViewerOption
): Ruler {
  const anno = new Ruler();

  if (!viewer) return anno;
  const viewState = viewer.getState();
  const section = getSectionDrawingViewState(viewState);

  const resolution = new Vector2().fromArray(viewer.getResolution());
  const halfLength = Math.min(resolution.x, resolution.y) * 0.5 * sizeRatio;
  const screenCenter = new Vector2().fromArray([
    resolution.x * 0.5,
    resolution.y * 0.5
  ]);

  const start = convertScreenCoordinateToVolumeCoordinate(
    section,
    resolution,
    new Vector2().fromArray([
      screenCenter.x - halfLength,
      screenCenter.y - halfLength
    ])
  );

  const end = convertScreenCoordinateToVolumeCoordinate(
    section,
    resolution,
    new Vector2().fromArray([
      screenCenter.x + halfLength,
      screenCenter.y + halfLength
    ])
  );

  anno.section = section;
  anno.start = [start.x, start.y, start.z];
  anno.end = [end.x, end.y, end.z];
  return anno;
}
