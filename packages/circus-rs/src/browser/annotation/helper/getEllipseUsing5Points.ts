import { Line3, Vector2, Vector3 } from 'three';
import {
  Ellipsoid,
  getIntersectedEllipseOrigin,
  intersectionOfEllipsoidAndLine
} from '../../../common/geometry/Ellipsoid';
import { Section, sectionToPlane } from '../../../common/geometry/Section';
import { getEigenvectorsOf2x2, getInverse } from '../../../common/math/Matrix';
import {
  convertScreenCoordinateToVolumeCoordinate,
  convertVolumeCoordinateToScreenCoordinate
} from '../../section-util';

export default function intersectEllipsoidAndSection(
  ellipsoid: Ellipsoid,
  section: Section,
  resolution: Vector2,
  ctx: CanvasRenderingContext2D
):
  | {
      origin: Vector2;
      radiusX: number;
      radiusY: number;
      rotate: number;
    }
  | undefined {
  const plane = sectionToPlane(section);
  const S_nv = plane.normal;
  const S_u = new Vector3().fromArray(section.xAxis).normalize();
  const S_v = new Vector3().fromArray(section.yAxis).normalize();

  const p3to2 = (p3: Vector3) =>
    convertVolumeCoordinateToScreenCoordinate(section, resolution, p3);

  const p2to3 = (p2: Vector2) =>
    convertScreenCoordinateToVolumeCoordinate(section, resolution, p2);

  const ES_o = getIntersectedEllipseOrigin(ellipsoid, plane);

  const points = get5PointsOnEllipseOutline(
    ellipsoid,
    S_nv,
    S_u,
    S_v,
    ES_o,
    (p3: Vector3) =>
      convertVolumeCoordinateToScreenCoordinate(section, resolution, p3)
  );

  const { A, B, C } = getParameters(points);

  const [eigenVector1, eigenVector2] = getEigenvectors(A, B, C);

  // get axis vector on canvas
  const [a, b] = (() => {
    const aLine = new Line3().set(
      ES_o,
      ES_o.clone().add(p2to3(eigenVector1.multiplyScalar(10000)))
    );
    const bLine = new Line3().set(
      ES_o,
      ES_o.clone().add(p2to3(eigenVector2.multiplyScalar(10000)))
    );

    const [a1] = intersectionOfEllipsoidAndLine(ellipsoid, aLine);
    const [b1] = intersectionOfEllipsoidAndLine(ellipsoid, bLine);

    return [a1, b1];
  })();

  // get rotate radian
  const origin = p3to2(ES_o);
  const rotate = Math.atan(B / (A - C)) / 2;
  const radiusX = p3to2(a)
    .sub(origin)
    .length();
  const radiusY = p3to2(b)
    .sub(origin)
    .length();

  return {
    origin,
    radiusX,
    radiusY,
    rotate
  };
}

function get5PointsOnEllipseOutline(
  E: Ellipsoid,
  S_nv: Vector3,
  S_u: Vector3,
  S_v: Vector3,
  ES_o: Vector3,
  mapper: (p3: Vector3) => Vector2
) {
  const points: Vector2[] = [];

  [
    S_v,
    S_u,
    S_v.clone().applyAxisAngle(S_nv, 180 / Math.PI),
    S_u.clone().applyAxisAngle(S_nv, 180 / Math.PI)
  ].forEach(v => {
    const L = new Line3().set(ES_o, ES_o.clone().add(v));
    const [p1, p2] = intersectionOfEllipsoidAndLine(E, L);
    if (p1 && points.length < 5) points.push(mapper(p1));
    if (p2 && points.length < 5) points.push(mapper(p2));
  });

  return points;
}

function getParameters(points: Vector2[]): { A: number; B: number; C: number } {
  const matrixK = points.map(point => {
    const p = point.clone();
    const n0 = p.x ** 2;
    const n1 = p.x * p.y;
    const n2 = p.y ** 2;
    const n3 = p.x;
    const n4 = p.y;
    return [n0, n1, n2, n3, n4];
  });

  const invK = getInverse(matrixK);

  const A = -invK[0][0] + -invK[0][1] + -invK[0][2] + -invK[0][3] + -invK[0][4];
  const B = -invK[1][0] + -invK[1][1] + -invK[1][2] + -invK[1][3] + -invK[1][4];
  const C = -invK[2][0] + -invK[2][1] + -invK[2][2] + -invK[2][3] + -invK[2][4];

  return { A, B, C };
}

function getEigenvectors(A: number, B: number, C: number): Vector2[] {
  const n11 = A;
  const n12 = B / 2;
  const n21 = B / 2;
  const n22 = C;
  const matrix = [[n11, n12], [n21, n22]];

  const [eigenVector1, eigenVector2] = getEigenvectorsOf2x2(matrix);

  return A > C ? [eigenVector1, eigenVector2] : [eigenVector2, eigenVector1];
}
