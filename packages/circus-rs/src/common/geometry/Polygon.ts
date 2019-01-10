import { ShapeUtils, Triangle, Vector2, Vector3 } from 'three';
import { DirectedSegment, intersectsDirectedSegment } from './Line';
import { vector2ToVector3 } from './Vector';

export interface Polygon {
  vertices: Vector2[];
  sides: DirectedSegment[];
}

interface TriangulateShapeResult {
  triangles: Triangle[];
  vertices: Vector3[];
}

/**
 * Sort the coordinates so that it becomes the vertex of a simple polygon if connect.
 * @param vertices Unsorted Vertices Coordinates Of Simple Polygon
 */
export function sortVerticesOfSimplePolygon(vertices: Vector2[]): Vector2[] {
  const sortedVertices: Vector2[] = vertices.sort((a: Vector2, b: Vector2) => {
    if (a.y > b.y) {
      return 1;
    } else if (a.y < b.y) {
      return -1;
    } else if (a.x > b.x) {
      return 1;
    } else if (a.x < b.x) {
      return -1;
    }
    return 0;
  });

  type PolygonVertex = { angle: number; p2: Vector2 };
  const basePolygonVertex = sortedVertices[0];
  const polygonVertices: PolygonVertex[] = [
    {
      angle: 0,
      p2: basePolygonVertex
    }
  ];
  for (let i = 1; i < sortedVertices.length; i++) {
    const angle = new Vector2()
      .subVectors(basePolygonVertex, sortedVertices[i])
      .angle();
    polygonVertices.push({
      angle: angle,
      p2: sortedVertices[i]
    });
  }

  const sortedPolygonVertices: PolygonVertex[] = polygonVertices.sort(
    (a: PolygonVertex, b: PolygonVertex) => {
      if (a.angle > b.angle) {
        return 1;
      } else if (a.angle < b.angle) {
        return -1;
      }
      return 0;
    }
  );

  return sortedPolygonVertices.map(v => v.p2);
}

/**
 * Returns true if the given the polygon overlaps the other polygon.
 * @param a Sorted polygon vertices
 * @param b Sorted polygon vertices
 */
export function intersectsPolygon(a: Vector2[], b: Vector2[]): boolean {
  const polygonA: Polygon = { vertices: a, sides: _polygonSides(a) };
  const polygonB: Polygon = { vertices: b, sides: _polygonSides(b) };

  if (_intersectsPolygonSide(_polygonSides(a), _polygonSides(b))) {
    // The sides of the two polygons intersect.
    return true;
  }

  const triangulateShapeResultA = _triangulateShape(polygonA);
  const triangulateShapeResultB = _triangulateShape(polygonB);
  if (
    triangulateShapeResultA.triangles.some(triangle =>
      triangulateShapeResultB.vertices.some(v3 => triangle.containsPoint(v3))
    ) ||
    triangulateShapeResultB.triangles.some(triangle =>
      triangulateShapeResultA.vertices.some(v3 => triangle.containsPoint(v3))
    )
  ) {
    // The vertex of one polygon is inside the other polygon.
    return true;
  }

  // No overlap between the two polygons.
  return false;
}

/**
 * Determine the given the polygon's sides.
 * @param vertices polygon's vertices
 */
function _polygonSides(vertices: Vector2[]): DirectedSegment[] {
  const sides: DirectedSegment[] = [];
  for (let i = 0; i < vertices.length; i++) {
    sides.push({
      from: vertices[i],
      to: i + 1 < vertices.length ? vertices[i + 1] : vertices[0]
    });
  }
  return sides;
}

/**
 * Returns true if the given the polygon's sides intersect the other polygon's sides.
 * @param segmentsA polygon's sides
 * @param segmentsB polygon's sides
 */
function _intersectsPolygonSide(
  segmentsA: DirectedSegment[],
  segmentsB: DirectedSegment[]
): boolean {
  return segmentsA.some(sideA =>
    segmentsB.some(sideB => intersectsDirectedSegment(sideA, sideB))
  );
}

/**
 * Divide the polygon into a collection of triangles.
 * @param polygon target of triangulate
 */
function _triangulateShape(polygon: Polygon): TriangulateShapeResult {
  type VertexIndex = number;
  type IndexOfTriangleVertex = [VertexIndex, VertexIndex, VertexIndex];

  const verticesV2 = polygon.vertices;

  const indexOfTriangleVertices: IndexOfTriangleVertex[] = ShapeUtils.triangulateShape(
    verticesV2,
    []
  ) as any;

  const verticesV3 = verticesV2.map(v2 => vector2ToVector3(v2));

  const triangles: Triangle[] = indexOfTriangleVertices.map(
    ([vIdx1, vIdx2, vIdx3]) =>
      new Triangle(verticesV3[vIdx1], verticesV3[vIdx2], verticesV3[vIdx3])
  );
  return { triangles: triangles, vertices: verticesV3 };
}
