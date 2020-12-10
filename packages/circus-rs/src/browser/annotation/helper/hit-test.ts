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
