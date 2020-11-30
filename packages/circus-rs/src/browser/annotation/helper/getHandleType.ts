import { Vector2, Vector3 } from 'three';
import { convertVolumeCoordinateToScreenCoordinate } from '../../section-util';
import Viewer from '../../viewer/Viewer';
import { defaultHandleSize } from './drawHandleFrame';

export type HandleType =
  | 'nw-resize'
  | 'n-resize'
  | 'ne-resize'
  | 'e-resize'
  | 'se-resize'
  | 's-resize'
  | 'sw-resize'
  | 'w-resize'
  | 'move';

export type HandleTypeForLine = 'start-reset' | 'end-reset' | 'line-move';

export const cursorSettableHandleType = [
  'nw-resize',
  'n-resize',
  'ne-resize',
  'e-resize',
  'se-resize',
  's-resize',
  'sw-resize',
  'w-resize',
  'move'
];

export default function getHandleType(
  viewer: Viewer,
  point: Vector2,
  min: number[],
  max: number[]
): HandleType | undefined {
  const viewState = viewer.getState();
  if (!viewer || !viewState) return;
  if (viewState.type !== 'mpr') return;

  const section = viewState.section;
  const resolution = new Vector2().fromArray(viewer.getResolution());

  return _getHandleType(
    point,
    convertVolumeCoordinateToScreenCoordinate(
      section,
      resolution,
      new Vector3().fromArray(min)
    ),
    convertVolumeCoordinateToScreenCoordinate(
      section,
      resolution,
      new Vector3().fromArray(max)
    )
  );
}

export function getHandleTypeForLine(
  viewer: Viewer,
  point: Vector2,
  line: { start: Vector3; end: Vector3 },
  resizable: boolean = true
): HandleTypeForLine | undefined {
  const handleSize = defaultHandleSize;

  const viewState = viewer.getState();
  if (!viewer || !viewState) return;
  if (viewState.type !== 'mpr') return;

  const resolution = new Vector2().fromArray(viewer.getResolution());

  const start = convertVolumeCoordinateToScreenCoordinate(
    viewState.section,
    resolution,
    line.start
  );
  const end = convertVolumeCoordinateToScreenCoordinate(
    viewState.section,
    resolution,
    line.end
  );

  if (resizable) {
    if (_getHandleType(point, start, start)) return 'start-reset';
    if (_getHandleType(point, end, end)) return 'end-reset';
  }

  const delta = new Vector2(end.x - start.x, end.y - start.y);
  const nu = delta.clone().normalize();
  const nv = new Vector2(delta.y, delta.x * -1).normalize();

  const o = start.clone().add(nv.clone().multiplyScalar(-handleSize));
  const p = point.clone().sub(o);
  const pu = p.dot(nu);
  const pv = p.dot(nv);

  return pu >= 0 && pv >= 0 && pu <= delta.length() && pv <= handleSize * 2
    ? 'line-move'
    : undefined;
}

const _getHandleType = (
  point: Vector2,
  min: Vector2,
  max: Vector2
): HandleType | undefined => {
  const handleSize = defaultHandleSize;

  const inBoundingBox =
    min.x - handleSize <= point.x &&
    point.x <= max.x + handleSize &&
    min.y - handleSize <= point.y &&
    point.y <= max.y + handleSize;

  if (!inBoundingBox) return;

  const onLeftEdge =
    min.x - handleSize <= point.x && point.x <= min.x + handleSize;
  const onRightEdge =
    max.x - handleSize <= point.x && point.x <= max.x + handleSize;
  const onTopEdge =
    min.y - handleSize <= point.y && point.y <= min.y + handleSize;
  const onBottomEdge =
    max.y - handleSize <= point.y && point.y <= max.y + handleSize;

  const xCenter = min.x + (max.x - min.x) / 2;
  const yCenter = min.y + (max.y - min.y) / 2;
  const onHorizontalCenter =
    xCenter - handleSize <= point.x && point.x <= xCenter + handleSize;
  const onVertialCenter =
    yCenter - handleSize <= point.y && point.y <= yCenter + handleSize;

  switch (true) {
    case onLeftEdge && onRightEdge && onTopEdge && onBottomEdge:
      return 'move';
    case onLeftEdge && onTopEdge:
      return 'nw-resize';
    case onTopEdge && onHorizontalCenter:
      return 'n-resize';
    case onTopEdge && onRightEdge:
      return 'ne-resize';
    case onRightEdge && onVertialCenter:
      return 'e-resize';
    case onRightEdge && onBottomEdge:
      return 'se-resize';
    case onBottomEdge && onHorizontalCenter:
      return 's-resize';
    case onBottomEdge && onLeftEdge:
      return 'sw-resize';
    case onLeftEdge && onVertialCenter:
      return 'w-resize';
    case onLeftEdge || onRightEdge || onTopEdge || onBottomEdge:
      return 'move';
    default:
      return undefined;
  }
};
