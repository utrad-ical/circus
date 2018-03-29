import { Vector2D, Vector3D } from './Vector';
import { Box2, Box3, Vector3 } from 'three';
import { LineSegment } from './LineSegment';
import { Section, intersectionOfLineSegmentAndPlane } from './Section';

/**
 * Represents a bounding box.
 */
export interface Box {
  origin: Vector3D;
  size: Vector3D;
}

export function boxEquals(box1: Box, box2: Box): boolean {
  return (
    box1.origin[0] === box2.origin[0] &&
    box1.origin[1] === box2.origin[1] &&
    box1.origin[2] === box2.origin[2] &&
    box1.size[0] === box2.size[0] &&
    box1.size[1] === box2.size[1] &&
    box1.size[2] === box2.size[2]
  );
}

/**
 * Calculates the intersection of the given box (cuboid) and the plane.
 * The section is treated as a plane that extends infinitely.
 * @param box The box
 * @param section The section
 * @returns {Array} Array of intersection points. Null if there is no intersection.
 */
export function intersectionOfBoxAndPlane(
  box: Box3,
  section: Section
): Vector3[] | null {
  const intersections: Vector3[] = [];
  const bmin = box.min;
  const bmax = box.max;

  // Prepare the 12 edges (line segments) of the box and
  // checks if at least one of them intersects the current section.
  // Top surface: t0-t1-t2-t3, Bottom surface: b0-b1-b2-b3
  //    T0 ------- T1
  //   / |        / |
  //  T3 ------- T2 |
  //  |  |       |  |
  //  |  B0 -----|- B1
  //  | /        | /
  //  B3 ------- B2

  const vertexes: Vector3[] = [
    new Vector3(bmin.x, bmin.y, bmin.z), // T0
    new Vector3(bmax.x, bmin.y, bmin.z), // T1
    new Vector3(bmax.x, bmax.y, bmin.z), // T2
    new Vector3(bmin.x, bmax.y, bmin.z), // T3
    new Vector3(bmin.x, bmin.y, bmax.z), // B0
    new Vector3(bmax.x, bmin.y, bmax.z), // B1
    new Vector3(bmax.x, bmax.y, bmax.z), // B2
    new Vector3(bmin.x, bmax.y, bmax.z) // B3
  ];

  // 12 sides of the cuboid
  // prettier-ignore
  const edgeIndexes = [
    [0, 1], [1, 2], [2, 3], [3, 0], // 4 edges around T0-T3
    [0, 4], [1, 5], [2, 6], [3, 7], // 4 edges from T0-B0 to T3-B3
    [4, 5], [5, 6], [6, 7], [7, 4]  // 4 edges around B0-B3
  ];

  for (let i = 0; i < 12; i++) {
    const from = vertexes[edgeIndexes[i][0]];
    const to = vertexes[edgeIndexes[i][1]];
    const edge: LineSegment = {
      origin: from,
      vector: new Vector3().subVectors(to, from)
    };
    const intersection = intersectionOfLineSegmentAndPlane(section, edge);
    if (intersection !== null) intersections.push(intersection);
  }

  return intersections.length === 0 ? null : intersections;
}
