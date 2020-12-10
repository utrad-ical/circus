import { Line3, Vector2, Vector3 } from 'three';
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

  return detectHandleTypeInBoundingBox(
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

const detectHandleTypeInBoundingBox = (
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
