import { Box2, Vector2 } from 'three';

/**
 * Slightly expands this rect so that it contains the original and all the vertexes are integers.
 * @param box The input Box2.
 */
export function box2GrowSubpixel(box: Box2): Box2 {
  box.min.x = Math.floor(box.min.x);
  box.min.y = Math.floor(box.min.y);
  box.max.x = Math.ceil(box.max.x);
  box.max.y = Math.ceil(box.max.y);
  return box;
}

/**
 * Scales the inner box as large as possible inside the outer rectangle,
 * maintaining the aspect ratio. The inner box will be placed at the center.
 * @param outer The outer box to which the inner rectangle is being fit.
 * @param inner The inner box.
 */
export function fitRectangle(outer: Vector2, inner: Vector2): Box2 {
  if (outer.x <= 0 || outer.y <= 0 || inner.x <= 0 || inner.y <= 0) {
    throw new RangeError('Invalid frame size.');
  }

  const outerAspect = outer.x / outer.y;
  const innerAspect = inner.x / inner.y;
  if (outerAspect > innerAspect) {
    // The outer rect is "wider" than the inner rect
    return new Box2(
      new Vector2((outer.x - outer.y * innerAspect) / 2, 0),
      new Vector2((outer.x + outer.y * innerAspect) / 2, outer.y)
    );
  } else {
    // The outer rect is "taller" than the inner rect
    return new Box2(
      new Vector2(0, (outer.y - outer.x / innerAspect) / 2),
      new Vector2(outer.x, (outer.y + outer.x / innerAspect) / 2)
    );
  }
}

/**
 * Determine the vertices of the box.
 * @param box target Box2.
 */
export function verticesOfBox(box: Box2): Vector2[] {
  const vertices: Vector2[] = [];
  vertices.push(box.min);
  if (!box.isEmpty()) {
    vertices.push(new Vector2(box.max.x, box.min.y));
    vertices.push(box.max);
    vertices.push(new Vector2(box.min.x, box.max.y));
  }
  return vertices;
}
