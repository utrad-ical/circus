import { Vector3 } from 'three';
import { Section } from '@utrad-ical/circus-rs/src/common/geometry';

const perpendicularLinesLeg = (
  normalVector: Vector3,
  pointInSection: number[]
) => {
  return (point: number[]) => {
    const scale =
      new Vector3().fromArray(point).dot(normalVector) -
      new Vector3().fromArray(pointInSection).dot(normalVector);
    return new Vector3()
      .fromArray(point)
      .sub(new Vector3().copy(normalVector).multiplyScalar(scale));
  };
};

const threshold0 = 10 ** -5;

const createSectuinFromPoints = (points: number[][], side = 128): Section => {
  const average = new Vector3(0, 0, 0);
  for (const point of points) {
    average.add(new Vector3().fromArray(point));
  }
  average.divideScalar(points.length);

  const n = new Vector3()
    .fromArray(points[0])
    .sub(new Vector3().fromArray(points[1]))
    .cross(
      new Vector3().fromArray(points[2]).sub(new Vector3().fromArray(points[1]))
    )
    .normalize();
  if (n.lengthSq() < threshold0) {
    throw new Error('The three points are on the same line.');
  }
  const leg = perpendicularLinesLeg(n, points[0]);
  const startingPoint = [0, 0, 0];
  let origin = leg(startingPoint);
  if (new Vector3().subVectors(origin, average).lengthSq() < threshold0) {
    startingPoint[1] = startingPoint[1] + side * 4;
    origin = leg(startingPoint);
  }
  startingPoint[0] = startingPoint[0] + side * 4;
  let xAxis = leg(startingPoint);
  if (new Vector3().subVectors(origin, xAxis).lengthSq() < threshold0) {
    startingPoint[1] = startingPoint[1] + side * 4;
    xAxis = leg(startingPoint);
  }
  xAxis.sub(origin);
  const oVector = new Vector3()
    .subVectors(origin, average)
    .normalize()
    .multiplyScalar(side * 2 ** 0.5);

  origin = new Vector3().addVectors(average, oVector);
  xAxis.normalize().multiplyScalar(side * 2);
  if (
    new Vector3().subVectors(origin, xAxis).sub(average).lengthSq() <
    new Vector3().addVectors(origin, xAxis).sub(average).lengthSq()
  ) {
    xAxis.negate();
  }
  const yAxis = new Vector3()
    .crossVectors(xAxis, n)
    .normalize()
    .multiplyScalar(side * 2);
  if (
    new Vector3().subVectors(origin, yAxis).sub(average).lengthSq() <
    new Vector3().addVectors(origin, yAxis).sub(average).lengthSq()
  ) {
    yAxis.negate();
  }
  return {
    origin: origin.toArray(),
    xAxis: xAxis.toArray(),
    yAxis: yAxis.toArray()
  };
};

export default createSectuinFromPoints;
