import { Vector2D } from './Vector';

/**
 * Represents a bounding box.
 */
export interface Rectangle {
  origin: Vector2D;
  size: Vector2D;
}

export function rectangleEquals(rect1: Rectangle, rect2: Rectangle): boolean {
  return (
    rect1.origin[0] === rect2.origin[0] &&
    rect1.origin[1] === rect2.origin[1] &&
    rect1.size[0] === rect2.size[0] &&
    rect1.size[1] === rect2.size[1]
  );
}

/**
 * Calculates the intersection of the two given rectangles.
 * @param rect1
 * @param rect2
 */
export function intersectionOfTwoRectangles(
  rect1: Rectangle,
  rect2: Rectangle
): Rectangle | null {
  const rect1right = rect1.origin[0] + rect1.size[0];
  const rect1bottom = rect1.origin[1] + rect1.size[1];
  const rect2right = rect2.origin[0] + rect2.size[0];
  const rect2bottom = rect2.origin[1] + rect2.size[1];

  if (
    rect1.origin[0] < rect2right &&
    rect1right > rect2.origin[0] &&
    rect1.origin[1] < rect2bottom &&
    rect1bottom > rect2.origin[1]
  ) {
    const x = Math.max(rect1.origin[0], rect2.origin[0]);
    const y = Math.max(rect1.origin[1], rect2.origin[1]);
    const r = Math.min(rect1right, rect2right);
    const b = Math.min(rect1bottom, rect2bottom);
    return { origin: [x, y], size: [r - x, b - y] };
  } else {
    return null;
  }
}

/**
 * Slightly expands this rect so that it contains the original and all the vertexes are integers.
 * @param rect
 * @returns {{origin: [number,number], size: [number,number]}}
 */
export function growSubPixel(rect: Rectangle): Rectangle {
  const left = Math.floor(rect.origin[0]);
  const top = Math.floor(rect.origin[1]);
  const right = Math.ceil(rect.origin[0] + rect.size[0]);
  const bottom = Math.ceil(rect.origin[1] + rect.size[1]);
  return { origin: [left, top], size: [right - left, bottom - top] };
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
