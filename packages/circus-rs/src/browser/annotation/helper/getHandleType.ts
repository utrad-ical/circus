import { Vector2, Vector3 } from 'three';
import { Viewer } from '../..';
import { convertVolumeCoordinateToScreenCoordinate } from '../../section-util';
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

  const resolution = new Vector2().fromArray(viewer.getResolution());

  const origin = convertVolumeCoordinateToScreenCoordinate(
    viewState.section,
    resolution,
    new Vector3().fromArray(min)
  );
  const terminus = convertVolumeCoordinateToScreenCoordinate(
    viewState.section,
    resolution,
    new Vector3().fromArray(max)
  );

  const handleSize = defaultHandleSize;

  const inBoundingBox =
    origin.x - handleSize <= point.x &&
    point.x <= terminus.x + handleSize &&
    origin.y - handleSize <= point.y &&
    point.y <= terminus.y + handleSize;

  if (!inBoundingBox) return;

  const onLeftEdge =
    origin.x - handleSize <= point.x && point.x <= origin.x + handleSize;
  const onRightEdge =
    terminus.x - handleSize <= point.x && point.x <= terminus.x + handleSize;
  const onTopEdge =
    origin.y - handleSize <= point.y && point.y <= origin.y + handleSize;
  const onBottomEdge =
    terminus.y - handleSize <= point.y && point.y <= terminus.y + handleSize;

  const xCenter = origin.x + (terminus.x - origin.x) / 2;
  const yCenter = origin.y + (terminus.y - origin.y) / 2;
  const onHorizontalCenter =
    xCenter - handleSize <= point.x && point.x <= xCenter + handleSize;
  const onVertialCenter =
    yCenter - handleSize <= point.y && point.y <= yCenter + handleSize;

  switch (true) {
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
}
