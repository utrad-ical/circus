import { vec3 } from 'gl-matrix';
import { Vector2D, Vector3D, Section, projectPointOntoSection } from '../common/geometry';
import RawData from '../common/RawData';
import { PixelFormat } from '../common/PixelFormat';

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

	const stepLength = stepLengthEntry.reduce(
		(prev, cur) => {
			return cur === null ? prev : ( prev < cur ? prev : cur );
		},
		Number.POSITIVE_INFINITY
	);

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
