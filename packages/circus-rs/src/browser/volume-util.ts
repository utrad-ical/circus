import { vec3 } from 'gl-matrix';
import { Vector3D, Box } from '../common/geometry';
import RawData from '../common/RawData';
import { PixelFormat } from '../common/PixelFormat';

/**
 * Scans all the voxels in the given volume and
 * determines the minimum bounding box that contains all the non-zero voxels.
 * @param volume The volume to scan over.
 * @param snap If this is set true and the volume is in binary format,
 *    the x-size will be normalized to the multiple of 8.
 * @return The bounding box measured in the given volume's coordinate.
 */
export function scanBoundingBox(volume: RawData, snap: boolean = true): Box {
	// TODO: Optimization!
	const [rx, ry, rz] = volume.getDimension();
	let minX = rx, maxX = -1;
	let minY = ry, maxY = -1;
	let minZ = rz, maxZ = -1;
	let val: number;
	for (let z = 0; z < rz; z++) {
		for (let y = 0; y < ry; y++) {
			for (let x = 0; x < rx; x++) {
				val = volume.getPixelAt(x, y, z);
				if (val !== 0) {
					if (minX > x) minX = x;
					if (maxX < x) maxX = x;
					if (minY > y) minY = y;
					if (maxY < y) maxY = y;
					if (minZ > z) minZ = z;
					if (maxZ < z) maxZ = z;
				}
			}
		}
	}

	if (maxX === -1) return null;

	const result: Box = {
		origin: [minX, minY, minZ],
		size: [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1]
	};

	if (snap && volume.getPixelFormat() === PixelFormat.Binary) {
		result.size[0] = Math.ceil(result.size[0] / 8) * 8;
	}

	return result;
}


/**
 * Fill all voxels with the given value when it intersects with the line segment
 * specified by the two points.
 * Voxels are filled when the line only "glances" them.
 * TODO: Introduce edge-overflow detection for all directions to reduce unnecessary calls to writePixelAt
 */
export function draw3DLine(volume: RawData,
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

	const pi = [p0[0], p0[1], p0[2]] as Vector3D; // clone

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
		const step = getStepToNeighbor(pi, e);
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
function getStepToNeighbor(pos: Vector3D, e: Vector3D): Vector3D {
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
