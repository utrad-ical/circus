import { Vector2, Vector3, Line3, Plane } from 'three';

/**
 * Section determines the MRP section of a volume.
 */
export interface Section {
  readonly origin: number[];
  readonly xAxis: number[]; // in millimeters
  readonly yAxis: number[]; // in millimeters
}

interface SectionVector {
  origin: Vector3;
  xAxis: Vector3;
  yAxis: Vector3;
}

/**
 * Converts the members of Section into Vector3 for easier calculation.
 * It is safe to modify the returned object because all the members are cloned.
 * @param section The input Section object.
 */
export function vectorizeSection(section: Section): SectionVector {
  return {
    origin: new Vector3().fromArray(section.origin),
    xAxis: new Vector3().fromArray(section.xAxis),
    yAxis: new Vector3().fromArray(section.yAxis)
  };
}

export function sectionToPlane(section: Section): Plane {
  const nv = normalVector(section);
  const origin = new Vector3().fromArray(section.origin);
  const plane = new Plane().setFromNormalAndCoplanarPoint(nv, origin);
  return plane;
}

export function projectPointOntoSection(
  section: Section,
  point: Vector3
): Vector2 {
  const vSection = vectorizeSection(section);
  const p = new Vector3().subVectors(point, vSection.origin);
  return new Vector2(
    vSection.xAxis.normalize().dot(p),
    vSection.yAxis.normalize().dot(p)
  );
}

export function distanceFromPointToSection(
  section: Section,
  point: Vector3
): number {
  return Math.abs(dotFromPointToSection(section, point));
}

export function dotFromPointToSection(
  section: Section,
  point: Vector3
): number {
  const normal = normalVector(section);
  const p = new Vector3().subVectors(
    point,
    new Vector3().fromArray(section.origin)
  );
  return normal.dot(p);
}

/**
 * Performs a parallel translation on a given section.
 */
export function translateSection(section: Section, delta: Vector3): Section {
  const vSection = vectorizeSection(section);
  return {
    origin: vSection.origin.add(delta).toArray(),
    xAxis: vSection.xAxis.toArray(),
    yAxis: vSection.yAxis.toArray()
  };
}

/**
 * Calculates the intersection point of the given line segment and the plane.
 * This does not check if the intersection is within the section
 * (i.e., section is treated as a plane that extends infinitely).
 * @return The intersection point. null if there is no intersection.
 * @deprecated Use toPlane() and intersectLine() instead.
 */
export function intersectionOfLineAndPlane(
  section: Section,
  line: Line3
): Vector3 | null {
  const nv = normalVector(section);
  const origin = new Vector3().fromArray(section.origin);

  const vecPA = new Vector3().subVectors(origin, line.start);
  const vecPB = new Vector3().subVectors(origin, line.end);

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
    return line.at(rate, new Vector3());
  }
}

/**
 * Returns true if the given point is within the given section.
 */
export function intersectionPointWithinSection(
  section: Section,
  pointOnSection: Vector3
): boolean {
  const vSection = vectorizeSection(section);
  const origin = vSection.origin;
  const op = new Vector3().subVectors(pointOnSection, origin);
  const lenX = vSection.xAxis.length();
  const lenY = vSection.yAxis.length();
  const dotX = vSection.xAxis.dot(op);
  const dotY = vSection.yAxis.dot(op);
  return 0 <= dotX && dotX <= lenX * lenX && 0 <= dotY && dotY <= lenY * lenY;
}

/**
 * Calculates the intersection point of the given line segment and the section.
 * @return The intersection point. null if there is no intersection.
 */
export function intersectionOfLineAndSection(
  section: Section,
  line: Line3
): Vector3 | null {
  const intersection = intersectionOfLineAndPlane(section, line);
  if (!intersection) return null;
  return intersectionPointWithinSection(section, intersection)
    ? intersection
    : null;
}

/**
 * Calculates the intersection line segment of two (finite) sections.
 * @param section1
 * @param section2
 * @returns The intersection line segment
 */
export function intersectionOfTwoSections(
  section1: Section,
  section2: Section
): Line3 | null {
  // [vertices]
  // 0--1
  // |  |
  // 3--2
  const intersectionPoints: Vector3[] = [];
  const plane1 = sectionToPlane(section1);
  const vsection1 = vectorizeSection(section1);
  const vertices1: Vector3[] = [
    vsection1.origin,
    vsection1.origin.clone().add(vsection1.xAxis),
    vsection1.origin.clone().add(vsection1.xAxis).add(vsection1.yAxis),
    vsection1.origin.clone().add(vsection1.yAxis)
  ];

  const plane2 = sectionToPlane(section2);
  const vsection2 = vectorizeSection(section2);
  const vertices2: Vector3[] = [
    vsection2.origin.clone(),
    vsection2.origin.clone().add(vsection2.xAxis),
    vsection2.origin.clone().add(vsection2.xAxis).add(vsection2.yAxis),
    vsection2.origin.clone().add(vsection2.yAxis)
  ];

  vertices1.reduce((from, to) => {
    const edge1 = new Line3(from, to);
    const intersection = plane2.intersectLine(edge1, new Vector3());
    if (intersection && intersectionPointWithinSection(section2, intersection))
      intersectionPoints.push(intersection);
    return to;
  }, vertices1[3]);

  vertices2.reduce((from, to) => {
    const edge2 = new Line3(from, to);
    const intersection = plane1.intersectLine(edge2, new Vector3());
    if (intersection && intersectionPointWithinSection(section1, intersection))
      intersectionPoints.push(intersection);
    return to;
  }, vertices2[3]);

  // Now intersections should normally contain 2 intersection points,
  // but when there are more, remove almost same point.
  const [start, end] = intersectionPoints.filter(
    (p0, i) =>
      !intersectionPoints
        .slice(0, i)
        .some(p1 => p0.distanceTo(p1) < Number.EPSILON)
  );

  return start && end ? new Line3(start, end) : null;
}

/**
 * Calculates the normal vector of the given section.
 * @param section The section.
 * @returns The calculated normal vector.
 */
export function normalVector(section: Section): Vector3 {
  return new Vector3()
    .fromArray(section.xAxis)
    .cross(new Vector3().fromArray(section.yAxis))
    .normalize();
}

/**
 * Compare the contents of the two sections.
 * @param a The section to compare.
 * @param b The section to compare.
 * @returns True if the two given Sections are identical.
 */
export function sectionEquals(a: Section, b: Section): boolean {
  const vectorEquals = (a: Array<number>, b: Array<number>) =>
    a.length === b.length && a.every((_, i) => a[i] === b[i]);
  return (
    vectorEquals(a.origin, b.origin) &&
    vectorEquals(a.xAxis, b.xAxis) &&
    vectorEquals(a.yAxis, b.yAxis)
  );
}

/**
 * Calculates the center point of the given the section.
 * @param section the section
 * @returns the center point of the given the section.
 */
export function sectionCenter(section: Section): Vector3 {
  return new Vector3(
    section.origin[0] + section.xAxis[0] / 2 + section.yAxis[0] / 2,
    section.origin[1] + section.xAxis[1] / 2 + section.yAxis[1] / 2,
    section.origin[2] + section.xAxis[2] / 2 + section.yAxis[2] / 2
  );
}
