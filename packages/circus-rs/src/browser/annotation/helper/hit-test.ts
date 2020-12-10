import { Vector2, Box2 } from 'three';

type LineSegment = { start: Vector2; end: Vector2 };
export function hitLineSegment(
  point: Vector2,
  { start, end }: LineSegment,
  margin: number = 5
) {
  if (start.equals(end)) return false;

  const lv = new Vector2(end.x - start.x, end.y - start.y);
  const nu = lv.clone().normalize();
  const nv = new Vector2(lv.y, lv.x * -1).normalize();

  const pv = point.clone().sub(start);
  const uDot = pv.dot(nu);
  const vDot = pv.dot(nv);

  const uDotMin = -margin;
  const uDotMax = lv.length() + margin;
  const vDotMin = -margin;
  const vDotMax = margin;

  return (
    uDotMin <= uDot && uDot <= uDotMax && vDotMin <= vDot && vDot <= vDotMax
  );
}
export function hitRectangle(point: Vector2, rect: Box2, margin: number = 0) {
  return new Box2(
    rect.min.clone().subScalar(margin),
    rect.max.clone().addScalar(margin)
  ).containsPoint(point);
}

export type BoundingRectWithHandleHitType =
  | 'north-west-handle'
  | 'north-handle'
  | 'north-east-handle'
  | 'east-handle'
  | 'south-east-handle'
  | 'south-handle'
  | 'south-west-handle'
  | 'west-handle'
  | 'rect-outline';

export function hitBoundingRectWithHandles(
  point: Vector2,
  boundingBox: Box2,
  handleSize: number = 5
): BoundingRectWithHandleHitType | undefined {
  const { min, max } = boundingBox;

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
      return 'rect-outline';
    case onLeftEdge && onTopEdge:
      return 'north-west-handle';
    case onTopEdge && onHorizontalCenter:
      return 'north-handle';
    case onTopEdge && onRightEdge:
      return 'north-east-handle';
    case onRightEdge && onVertialCenter:
      return 'east-handle';
    case onRightEdge && onBottomEdge:
      return 'south-east-handle';
    case onBottomEdge && onHorizontalCenter:
      return 'south-handle';
    case onBottomEdge && onLeftEdge:
      return 'south-west-handle';
    case onLeftEdge && onVertialCenter:
      return 'west-handle';
    case onLeftEdge || onRightEdge || onTopEdge || onBottomEdge:
      return 'rect-outline';
    default:
      return undefined;
  }
}
