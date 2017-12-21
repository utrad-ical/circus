import { Vector2D, Vector3D } from './Vector';
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
  box: Box,
  section: Section
): Vector3D[] | null {
  const intersections: Vector3D[] = [];
  const boxOrigin = box.origin;
  const boxSize = box.size;

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

  const vertexes: Vector3D[] = [
    [boxOrigin[0], boxOrigin[1], boxOrigin[2]], // T0
    [boxOrigin[0] + boxSize[0], boxOrigin[1], boxOrigin[2]], // T1
    [boxOrigin[0] + boxSize[0], boxOrigin[1] + boxSize[1], boxOrigin[2]], // T2
    [boxOrigin[0], boxOrigin[1] + boxSize[1], boxOrigin[2]], // T3
    [boxOrigin[0], boxOrigin[1], boxOrigin[2] + boxSize[2]], // B0
    [boxOrigin[0] + boxSize[0], boxOrigin[1], boxOrigin[2] + boxSize[2]], // B1
    [
      boxOrigin[0] + boxSize[0],
      boxOrigin[1] + boxSize[1],
      boxOrigin[2] + boxSize[2]
    ], // B2
    [boxOrigin[0], boxOrigin[1] + boxSize[1], boxOrigin[2] + boxSize[2]] // B3
  ];

  // 12 sides of the cuboid
  const edgeIndexes: Vector2D[] = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0], // 4 edges around T0-T3
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7], // 4 edges from T0-B0 to T3-B3
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4] // 4 edges around B0-B3
  ];

  for (let i = 0; i < 12; i++) {
    const from = vertexes[edgeIndexes[i][0]];
    const to = vertexes[edgeIndexes[i][1]];
    const edge: LineSegment = {
      origin: from,
      vector: [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
    };
    const intersection = intersectionOfLineSegmentAndPlane(section, edge);
    if (intersection !== null) intersections.push(intersection);
  }

  return intersections.length === 0 ? null : intersections;
}
