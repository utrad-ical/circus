import { vec3 } from 'gl-matrix';
import { Vector2D, Vector3D } from './Vector';
import { LineSegment } from './LineSegment';

/**
 * Section determines the MRP section of a volume.
 */
export interface Section {
	origin: Vector3D;
	xAxis: Vector3D; // in millimeters
	yAxis: Vector3D; // in millimeters
}

export function projectPointOntoSection(section: Section, point: Vector3D): Vector2D {
	const p = vec3.subtract(vec3.create(), point, section.origin);
	return [
		vec3.dot(vec3.normalize(vec3.create(), section.xAxis), p),
		vec3.dot(vec3.normalize(vec3.create(), section.yAxis), p)
	];
}


/**
 * Performs a parallel translation on a given section.
 */
export function translateSection(section: Section, delta: Vector3D): Section {
	const origin: [number, number, number] = [
		section.origin[0] + delta[0],
		section.origin[1] + delta[1],
		section.origin[2] + delta[2]
	];
	return {
		origin,
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
export function intersectionOfLineSegmentAndPlane(section: Section, line: LineSegment): Vector3D {

	const nv = normalVector(section);
	const P = section.origin;
	const endA = line.origin;
	const endB = vec3.add(vec3.create(), line.origin, line.vector);

	const vecPA = vec3.subtract(vec3.create(), P, endA);
	const vecPB = vec3.subtract(vec3.create(), P, endB);

	const dotNvA = vec3.dot(vecPA, nv);
	const dotNvB = vec3.dot(vecPB, nv);

	if (dotNvA === 0 && dotNvB === 0) { // the line is parallel to the section
		return null;
	} else if (0 < dotNvA && 0 < dotNvB) { // both ends of the line are above the section
		return null;
	} else if (dotNvA < 0 && dotNvB < 0) { // both ends of the line are under the section
		return null;
	} else {
		const rate = Math.abs(dotNvA) / (Math.abs(dotNvA) + Math.abs(dotNvB));
		const vecAX = vec3.scale(vec3.create(), line.vector, rate);
		// the intersection point
		return vec3.add(vec3.create(), endA, vecAX) as Vector3D;
	}
}

/**
 * Returns true if the given point is withing the given section.
 */
export function intersectionPointWithinSection(section: Section, pointOnSection: Vector2D): boolean {
	const o = section.origin;
	const op = [pointOnSection[0] - o[0], pointOnSection[1] - o[1], pointOnSection[2] - o[2]];
	const lenX = vec3.len(section.xAxis);
	const lenY = vec3.len(section.yAxis);
	const dotX = vec3.dot(op, section.xAxis);
	const dotY = vec3.dot(op, section.yAxis);
	return (
		0 <= dotX && dotX <= lenX * lenX &&
		0 <= dotY && dotY <= lenY * lenY
	);
}

/**
 * Calculates the intersection point of the given line segment and the section.
 * @return The intersection point. null if there is no intersection.
 */
export function intersectionOfLineSegmentAndSection(section: Section, line: LineSegment): Vector3D {
	const intersection = intersectionOfLineSegmentAndPlane(section, line);
	if (!intersection) return null;
	return intersectionPointWithinSection(section, intersection) ? intersection : null;
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
	base: Section, target: Section
): LineSegment {
	const intersections: Vector3D[] = [];

	// Prepare the 4 edges (line segments) of the target section.
	const tOrigin = target.origin;


	// 0--1
	// |  |
	// 3--2
	const vertexes: Vector3D[] = [
		tOrigin,
		vec3.add(vec3.create(), tOrigin, target.xAxis) as Vector3D,
		vec3.add(vec3.create(), vec3.add(vec3.create(), tOrigin, target.xAxis), target.yAxis)  as Vector3D,
		vec3.add(vec3.create(), tOrigin, target.yAxis) as Vector3D
	];

	const edgeIndexes: Vector2D[] = [
		[0, 1], [1, 2], [2, 3], [3, 0]
	];

	for (let i = 0; i < 4; i++) {
		const from = vertexes[edgeIndexes[i][0]];
		const to = vertexes[edgeIndexes[i][1]];
		const edge: LineSegment = {
			origin: from,
			vector: [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
		};
		const intersection = intersectionOfLineSegmentAndPlane(base, edge);
		if (intersection !== null)
			intersections.push(intersection);
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
		if (vec3.distance(intersections[0], intersections[i]) > 0.0001) {
			return {
				origin: intersections[0],
				vector: vec3.sub(vec3.create(), intersections[i], intersections[0]) as Vector3D
			}
		}
	}

	return null;

}


/**
 * Calculates the normal vector of the given section.
 */
export function normalVector(section: Section): Vector3D {
	let nv = vec3.create();
	vec3.cross(nv, section.xAxis, section.yAxis);
	vec3.normalize(nv, nv);
	return nv as Vector3D;
}
