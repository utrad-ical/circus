import { vec3 } from 'gl-matrix';
import RawData, { Vector2D, Vector3D } from '../common/RawData';
import { PixelFormat } from '../common/PixelFormat';
import { Section } from './section';

/**
 * Represents one line segment.
 */
export interface LineSegment {
	origin: Vector3D;
	vector: Vector3D;
}

/**
 * Converts 3D point in volume coordinate space to 2D point in screen space using the given section.
 * @param section
 * @param resolution
 * @param point
 * @returns {Vector2D}
 */
export function convertVolumeCoordinateToScreenCoordinate(
	section: Section,
	resolution: Vector2D,
	point: Vector3D
): Vector2D {
	const projection: Vector2D = projectPointOntoSection(section, point);
	return [
		projection[0] * resolution[0] / vec3.length(section.xAxis),
		projection[1] * resolution[1] / vec3.length(section.yAxis)
	];
}

export function projectPointOntoSection(section: Section, point: Vector3D): Vector2D {
	const p = vec3.subtract(vec3.create(), point, section.origin);
	return [
		vec3.dot(vec3.normalize(vec3.create(), section.xAxis), p),
		vec3.dot(vec3.normalize(vec3.create(), section.yAxis), p)
	];
}

/**
 * Converts 2D point in screen coordinate to 3D point in volume coordinate space.
 * @param section
 * @param resolution
 * @param p2
 * @returns {Vector3D}
 */
export function convertScreenCoordinateToVolumeCoordinate(section: Section,
	resolution: Vector2D,
	p2: Vector2D
): Vector3D {

	const p3 = vec3.clone(section.origin) as Vector3D;

	const xComponent = [
		p2[0] * ( section.xAxis[0] / resolution[0] ),
		p2[0] * ( section.xAxis[1] / resolution[0] ),
		p2[0] * ( section.xAxis[2] / resolution[0] )
	];
	const yComponent = [
		p2[1] * ( section.yAxis[0] / resolution[1] ),
		p2[1] * ( section.yAxis[1] / resolution[1] ),
		p2[1] * ( section.yAxis[2] / resolution[1] )
	];

	vec3.add(p3, p3, xComponent);
	vec3.add(p3, p3, yComponent);

	return p3;
}

/**
 * Calculates the intersection point of the given line segment and the section.
 * @return The intersection point. null if there is no intersection.
 */
export function intersectionOfLineSegmentAndSection(section: Section, line: LineSegment): Vector3D {

	const nv = normalVector(section);
	const P = section.origin;
	const endA = line.origin;
	const endB = vec3.add(vec3.create(), line.origin, line.vector);

	// // for debug -----------------------------------
	// let vertexes = [];
	// vertexes.push( vec3.clone( section.origin ) );
	// vertexes.push( vec3.add(vec3.create(), section.origin, section.xAxis) );
	// vertexes.push( vec3.add(vec3.create(), section.origin, vec3.add(vec3.create(), section.yAxis, section.xAxis)) );
	// vertexes.push( vec3.add(vec3.create(), section.origin, section.yAxis) );
	// console.log( 'Section: ' +
	// vec3.str(vertexes[0]).substr(4) + ' - ' +
	// vec3.str(vertexes[1]).substr(4) + ' - ' +
	// vec3.str(vertexes[2]).substr(4) + ' - ' +
	// vec3.str(vertexes[3]).substr(4) );
	// console.log( 'Line: ' + vec3.str(endA).substr(4) + ' - ' + vec3.str(endB).substr(4) );
	// // ----------------------------------- for debug

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
 * Calculates the intersection of the given box (cuboid) and the section.
 * @param boxOrigin
 * @param boxSize
 * @param section
 * @returns {Array} Array of intersection points. Null if there is no intersection.
 */
export function intersectionOfBoxAndSection(
	boxOrigin: Vector3D,
	boxSize: Vector3D,
	section: Section
): Vector3D[] {
	const intersections = [];

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
		[ boxOrigin[0]             , boxOrigin[1]             , boxOrigin[2]              ], // T0
		[ boxOrigin[0] + boxSize[0], boxOrigin[1]             , boxOrigin[2]              ], // T1
		[ boxOrigin[0] + boxSize[0], boxOrigin[1] + boxSize[1], boxOrigin[2]              ], // T2
		[ boxOrigin[0]             , boxOrigin[1] + boxSize[1], boxOrigin[2]              ], // T3
		[ boxOrigin[0]             , boxOrigin[1]             , boxOrigin[2] + boxSize[2] ], // B0
		[ boxOrigin[0] + boxSize[0], boxOrigin[1]             , boxOrigin[2] + boxSize[2] ], // B1
		[ boxOrigin[0] + boxSize[0], boxOrigin[1] + boxSize[1], boxOrigin[2] + boxSize[2] ], // B2
		[ boxOrigin[0]             , boxOrigin[1] + boxSize[1], boxOrigin[2] + boxSize[2] ]  // B3
	];

	// 12 sides of the cuboid
	const edgeIndexes: Vector2D[] = [
		[0, 1], [1, 2], [2, 3], [3, 0], // 4 edges around T0-T3
		[0, 4], [1, 5], [2, 6], [3, 7], // 4 edges from T0-B0 to T3-B3
		[4, 5], [5, 6], [6, 7], [7, 4]  // 4 edges around B0-B3
	];

	for (let i = 0; i < 12; i++) {
		const from = vertexes[edgeIndexes[i][0]];
		const to = vertexes[edgeIndexes[i][1]];
		const edge: LineSegment = {
			origin: from,
			vector: [to[0] - from[0], to[1] - from[1], to[2] - from[2]]
		};
		const intersection = intersectionOfLineSegmentAndSection(section, edge);
		if (intersection !== null)
			intersections.push(intersection);
	}

	return intersections.length === 0 ? null : intersections;
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


/**
 * Fill all voxels with the given value when it intersects with the line segment
 * specified by the two points.
 * Voxels are filled when the line only "glances" them.
 * TODO: 方向別のエッジ超え判定を導入し、無駄な writePixelAt の呼び出しを低減させる
 */
export function mmLine3(volume: RawData,
	p0: Vector3D, // offset (not mm!)
	p1: Vector3D, // offset (not mm!)
	value: number = 1
): void {
	if (volume.getPixelFormat() !== PixelFormat.Binary) {
		throw new Error('This function only supports binary format.');
	}

	const e = vec3.normalize(vec3.create(), [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]) as Vector3D;
	const distance = vec3.length([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
	let walked = 0.0;

	const pi = p0.concat() as Vector3D;

	const trim_x = e[0] < 0
		? (i) => i === Math.floor(i) ? i - 1 : Math.floor(i)
		: (i) => Math.floor(i);
	const trim_y = e[1] < 0
		? (i) => i === Math.floor(i) ? i - 1 : Math.floor(i)
		: (i) => Math.floor(i);
	const trim_z = e[2] < 0
		? (i) => i === Math.floor(i) ? i - 1 : Math.floor(i)
		: (i) => Math.floor(i);

	do {
		volume.writePixelAt(value, trim_x(pi[0]), trim_y(pi[1]), trim_z(pi[2]));

		let step = getStepToNeighbor(pi, e);
		// console.log('pi: '+vec3.str(pi));
		vec3.add(pi, pi, step);
		walked += vec3.length(step);

	} while (walked < distance);

	volume.writePixelAt(value, Math.floor(p1[0]), Math.floor(p1[1]), Math.floor(p1[2])); // 誤差吸収
}


/**
 * Calculates the nearest voxel, starting from the `pos`, and in the direction specified by `e`.
 * @param pos The starting point from which the calculation is done.
 * @param e An unit vector that represents the direction.
 * @return neighbor pos.
 * TODO: this function may be slow due to the use of reduce.
 */
export function getStepToNeighbor(pos: Vector3D, e: Vector3D): Vector3D {
	let stepLengthEntry = [
		nextLatticeDistance(pos[0], e[0]),
		nextLatticeDistance(pos[1], e[1]),
		nextLatticeDistance(pos[2], e[2])
	];
	stepLengthEntry = stepLengthEntry.filter((i) => i !== null);

	const stepLength = stepLengthEntry.reduce((prev, cur) => {
		return cur === null ? prev : ( prev < cur ? prev : cur );
	}, Number.POSITIVE_INFINITY);

	// console.log( stepLength.toString() + ' / ' + vec3.str( stepLengthEntry) );

	return [
		e[0] * stepLength,
		e[1] * stepLength,
		e[2] * stepLength
	];
}


/**
 * Calculates the distance(?) to the next lattice point. (one dimensional)
 * @param p starting point
 * @param u the direction
 */
function nextLatticeDistance(p: number, u: number): number {
	if (u === 0) return null;
	const i = u < 0 ? Math.floor(p) : Math.ceil(p);
	if (p === i) return Math.abs(1 / u);

	return Math.abs(( p - i ) / u);
}
