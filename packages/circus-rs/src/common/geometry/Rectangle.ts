import { Vector2D } from './Vector';
import { Box2 } from 'three';

/**
 * Represents a bounding box.
 */
export interface Rectangle {
  origin: Vector2D;
  size: Vector2D;
}

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
 * Scales the inner box as large as possible inside the outer rectangle, maintaining the aspect ratio.
 * @param outer The out case to which the inner rectangle is being fit.
 * @param inner
 */
export function fitRectangle(outer: Vector2D, inner: Vector2D): Rectangle {
  if (outer[0] <= 0 || outer[1] <= 0 || inner[0] <= 0 || inner[1] <= 0) {
    throw new RangeError('Invalid frame size.');
  }

  const outerAspect = outer[0] / outer[1];
  const innerAspect = inner[0] / inner[1];
  if (outerAspect > innerAspect) {
    // The outer rect is "wider" than the inner rect
    return {
      origin: [(outer[0] - outer[1] * innerAspect) / 2, 0],
      size: [outer[1] * innerAspect, outer[1]]
    };
  } else {
    // The outer rect is "taller" than the inner rect
    return {
      origin: [0, (outer[1] - outer[0] / innerAspect) / 2],
      size: [outer[0], outer[0] / innerAspect]
    };
  }
}
