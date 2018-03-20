import { Vector2, Vector3 } from 'three';
import { LineSegment } from './LineSegment';

/**
 * Section determines the MRP section of a volume.
 */
export interface Section {
  origin: Vector3;
  xAxis: Vector3; // in millimeters
  yAxis: Vector3; // in millimeters
}

export function projectPointOntoSection(
  section: Section,
  point: Vector3
): Vector2 {
  const p = new Vector3().subVectors(point, section.origin);
  return new Vector2(
    section.xAxis.normalize().dot(p),
    section.yAxis.normalize().dot(p)
  );
}

/**
 * Performs a parallel translation on a given section.
 */
export function translateSection(section: Section, delta: Vector3): Section {
  return {
    origin: section.origin.clone().add(delta),
    xAxis: section.xAxis,
    yAxis: section.yAxis
  };
}

/**
 * Calculates the intersection point of the given line segment and the plane.
 * This does not check if the intersection is within the section
 * (i.e., section is treated as a plane that extends infinitely).
 * @return The intersection point. null if there is no intersection.
 */
export function intersectionOfLineSegmentAndPlane(
  section: Section,
  line: LineSegment
): Vector3 | null {
  const nv = normalVector(section);
  const P = section.origin;
  const endA = line.origin;
  const endB = new Vector3().addVectors(line.origin, line.vector);

  const vecPA = new Vector3().subVectors(P, endA);
  const vecPB = new Vector3().subVectors(P, endB);

  const dotNvA = vecPA.dot(nv);
  const dotNvB = vecPB.dot(nv);

  if (dotNvA === 0 && dotNvB === 0) {
    // the line is parallel to the section
    return null;
  } else if (0 < dotNvA && 0 < dotNvB) {
    // both ends of the line are above the section
    return null;
  } else if (dotNvA < 0 && dotNvB < 0) {
    // both ends of the line are under the section
    return null;
  } else {
    const rate = Math.abs(dotNvA) / (Math.abs(dotNvA) + Math.abs(dotNvB));
    const vecAX = line.vector.clone().multiplyScalar(rate);
    // the intersection point
    return new Vector3().addVectors(endA, vecAX);
  }
}

/**
 * Returns true if the given point is within the given section.
 */
export function intersectionPointWithinSection(
  section: Section,
  pointOnSection: Vector3
): boolean {
  const o = section.origin;
  const op = new Vector3().subVectors(pointOnSection, o);
  const lenX = section.xAxis.length();
  const lenY = section.yAxis.length();
  const dotX = section.xAxis.dot(op);
  const dotY = section.yAxis.dot(op);
  return 0 <= dotX && dotX <= lenX * lenX && 0 <= dotY && dotY <= lenY * lenY;
}

/**
 * Calculates the intersection point of the given line segment and the section.
 * @return The intersection point. null if there is no intersection.
 */
export function intersectionOfLineSegmentAndSection(
  section: Section,
  line: LineSegment
): Vector3 | null {
  const intersection = intersectionOfLineSegmentAndPlane(section, line);
  if (!intersection) return null;
  return intersectionPointWithinSection(section, intersection)
    ? intersection
    : null;
}

/**
 * Calculates the intersection of two (finite) sections.
 * @param base The base section, on which the target section is projected
 * @param target The target section
 * @returns The line segment which represents how the target section intersects with the base section.
 * The resulting line segment may extend outside the boundry of base,
 * while it does not extend outside the target.
 */
export function intersectionOfTwoSections(
  base: Section,
  target: Section
): LineSegment | null {
  const intersections: Vector3[] = [];

  // Prepare the 4 edges (line segments) of the target section.
  const tOrigin = target.origin;

  // 0--1
  // |  |
  // 3--2
  //
  // prettier-ignore
  const vertexes: Vector3[] = [
    tOrigin,
    tOrigin.clone().add(target.xAxis),
    tOrigin.clone().add(target.xAxis).add(target.yAxis),
    tOrigin.clone().add(target.yAxis)
  ];

  const edgeIndexes: number[][] = [[0, 1], [1, 2], [2, 3], [3, 0]];

  for (let i = 0; i < 4; i++) {
    const from = vertexes[edgeIndexes[i][0]];
    const to = vertexes[edgeIndexes[i][1]];
    const edge: LineSegment = {
      origin: from,
      vector: new Vector3().subVectors(to, from)
    };
    const intersection = intersectionOfLineSegmentAndPlane(base, edge);
    if (intersection !== null) intersections.push(intersection);
  }

  if (intersections.length < 2) {
    // two sections do not intersect at all
    return null;
  }
  if (intersections.every(p => !intersectionPointWithinSection(base, p))) {
    // the target section intersects with the plane containing the base section,
    // but somewhere outside of the boundary of the base section
    return null;
  }

  // Now intersections should normally contain 2 intersection points,
  // but when there are more, find one which is different from the first
  for (let i = 1; i < intersections.length; i++) {
    if (intersections[0].distanceTo(intersections[i]) > 0.0001) {
      return {
        origin: intersections[0],
        vector: new Vector3().subVectors(intersections[i], intersections[0])
      };
    }
  }

  return null;
}

/**
 * Calculates the normal vector of the given section.
 */
export function normalVector(section: Section): Vector3 {
  return section.xAxis.cross(section.yAxis).normalize();
}
