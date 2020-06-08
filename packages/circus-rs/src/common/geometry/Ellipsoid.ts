import { Box3, Vector2, Vector3, Line3, Plane, Box2 } from 'three';

export interface Ellipsoid {
  origin: Vector3;
  radiusX: number;
  radiusY: number;
  radiusZ: number;
}

export interface Ellipse {
  origin: Vector2;
  radiusX: number;
  radiusY: number;
}

/**
 * Calculates the ellipsoid inscribed of the given box.
 * @param boundingBox
 */
export const getInscribedEllipsoid = (boundingBox: Box3): Ellipsoid => {
  const size = boundingBox.getSize(new Vector3());
  return {
    origin: boundingBox.getCenter(new Vector3()),
    radiusX: size.x / 2,
    radiusY: size.y / 2,
    radiusZ: size.z / 2
  };
};

/**
 * Calculates the ellipse inscribed of the given rectangle.
 * @param rectangle
 */
export const getInscribedEllipse = (rectangle: Box2): Ellipse => {
  const size = rectangle.getSize(new Vector2());
  return {
    origin: rectangle.getCenter(new Vector2()),
    radiusX: size.x / 2,
    radiusY: size.y / 2
  };
};

/**
 * Calculates the center point of the ellipse formed by cutting the ellipsoid in the given plane.
 * @param ellipsoid
 * @param plane
 */
export const getIntersectedEllipseOrigin = (
  ellipsoid: Ellipsoid,
  plane: Plane
) => {
  // Distance from ellipsoid origin to plane.
  const w = plane.distanceToPoint(ellipsoid.origin);

  const nv = plane.normal;

  const coef =
    w /
    ((ellipsoid.radiusX * nv.x) ** 2 +
      (ellipsoid.radiusY * nv.y) ** 2 +
      (ellipsoid.radiusZ * nv.z) ** 2);

  return new Vector3()
    .set(
      -(ellipsoid.radiusX ** 2) * nv.x * coef,
      -(ellipsoid.radiusY ** 2) * nv.y * coef,
      -(ellipsoid.radiusZ ** 2) * nv.z * coef
    )
    .add(ellipsoid.origin);
};

/**
 * Calculates the intersection point of the given line segment and the ellipsoid.
 * Return only the real root of the equation.
 * https://gist.github.com/earth2001y/5418519
 *
 * @param ellipsoid
 * @param line
 */
export const intersectionOfEllipsoidAndLine = (
  ellipsoid: Ellipsoid,
  line: Line3
) => {
  const radius = new Vector3().set(
    ellipsoid.radiusX,
    ellipsoid.radiusY,
    ellipsoid.radiusZ
  );
  const Lo = line.start.clone().sub(ellipsoid.origin);

  const Lv = new Vector3().set(
    line.end.x - line.start.x,
    line.end.y - line.start.y,
    line.end.z - line.start.z
  );

  const A =
    Math.pow(Lv.x / radius.x, 2) +
    Math.pow(Lv.y / radius.y, 2) +
    Math.pow(Lv.z / radius.z, 2);
  const B =
    (Lo.x * Lv.x * 2) / Math.pow(radius.x, 2) +
    (Lo.y * Lv.y * 2) / Math.pow(radius.y, 2) +
    (Lo.z * Lv.z * 2) / Math.pow(radius.z, 2);

  const C =
    Math.pow(Lo.x / radius.x, 2) +
    Math.pow(Lo.y / radius.y, 2) +
    Math.pow(Lo.z / radius.z, 2) -
    1.0;

  const D = Math.pow(B, 2) - 4 * A * C;

  if (D >= 0) {
    const t1 = (-B + Math.sqrt(D)) / (2 * A);
    const t2 = (-B - Math.sqrt(D)) / (2 * A);
    const Q1 = Lo.clone()
      .add(Lv.clone().multiplyScalar(t1))
      .add(ellipsoid.origin);
    const Q2 = Lo.clone()
      .add(Lv.clone().multiplyScalar(t2))
      .add(ellipsoid.origin);
    if (Q1.distanceTo(Q2) > 0) {
      return [Q1, Q2];
    } else {
      return [Q1];
    }
  } else {
    return [];
  }
};
