import { vec3 } from 'gl-matrix';
import RawData from '../common/RawData';
import { PixelFormat } from '../common/PixelFormat';
import { Section } from './section';

/**
 * Represents one line segment.
 */
interface LineSegment {
	// origin: [number,number,number],// [mm]
	// vector: [number,number,number] // [mm]
	origin: number[]; // [mm]
	vector: number[]; // [mm]
}

export function coordinate2D(section: Section,
	resolution: [number, number],
	p3: [number, number, number]
): [number, number] {
	const p = vec3.subtract(vec3.create(), p3, section.origin);

	const p2 = [
		vec3.dot(vec3.normalize(vec3.create(), section.xAxis), p) * resolution[0] / vec3.length(section.xAxis),
		vec3.dot(vec3.normalize(vec3.create(), section.yAxis), p) * resolution[1] / vec3.length(section.yAxis)
	];

	return [p2[0], p2[1]];
}


export function coordinate3D(section: Section,
	resolution: [number, number],
	p2: [number, number]
): [number, number, number] {

	let p3 = vec3.clone(section.origin);

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

	return [p3[0], p3[1], p3[2]];
}


/**
 * Calculates the intersection point of the given line segment and the section.
 * @return The intersection point. null if there is no intersection.
 */
export function getIntersection(section: Section, line: LineSegment): [number, number, number] {

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
		return vec3.add(vec3.create(), endA, vecAX) as [number, number, number];
	}
}


/**
 * Calculates the normal vector of the given section.
 */
export function normalVector(section: Section): [number, number, number] {
	let nv = vec3.create();
	vec3.cross(nv, section.xAxis, section.yAxis);
	vec3.normalize(nv, nv);
	return nv as [number, number, number];
}


/**
 * Fill all voxels with the given value when it intersects with the line segment
 * specified by the two points.
 * Voxels are filled when the line only "glances" them.
 * TODO: 方向別のエッジ超え判定を導入し、無駄な writePixelAt の呼び出しを低減させる
 */
export function mmLine3(volume: RawData,
	p0: [number, number, number], // offset (not mm!)
	p1: [number, number, number], // offset (not mm!)
	value: number = 1
): void {
	if (volume.getPixelFormat() !== PixelFormat.Binary) {
		throw new Error('This function only supports binary format.');
	}

	const e = vec3.normalize(vec3.create(), [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]) as [number, number, number];
	const distance = vec3.length([p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]]);
	let walked = 0.0;

	const pi = p0.concat() as [number, number, number];

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
export function getStepToNeighbor(
	pos: [number, number, number], e: [number, number, number]
): [number, number, number] {
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
export function nextLatticeDistance(p: number, u: number): number {
	if (u === 0) return null;
	const i = u < 0 ? Math.floor(p) : Math.ceil(p);
	if (p === i) return Math.abs(1 / u);

	return Math.abs(( p - i ) / u);
}
