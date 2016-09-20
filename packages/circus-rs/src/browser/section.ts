import * as gl from 'gl-matrix';
import { Vector2D, Vector3D, Section } from '../common/geometry';

export type OrientationString = 'axial' | 'sagittal' | 'coronal' | 'oblique';

/**
 * Investigates the section orientation and detects if the section
 * is (almost) orthogonal to one of the three axes.
 * @return One of 'axial', 'sagittal', 'coronal' or 'oblique'
 */
export function detectOrthogonalSection(section: Section): OrientationString {
	const { xAxis, yAxis } = section;
	if (parallelToX(xAxis) && parallelToY(yAxis)) return 'axial';
	if (parallelToY(xAxis) && parallelToZ(yAxis)) return 'sagittal';
	if (parallelToX(xAxis) && parallelToZ(yAxis)) return 'coronal';
	return 'oblique';
}

const THRESHOLD = 0.0001;

export function parallelToX(vec: Vector3D): boolean {
	const a = gl.vec3.angle(vec, gl.vec3.fromValues(1, 0, 0));
	return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

export function parallelToY(vec: Vector3D): boolean {
	const a = gl.vec3.angle(vec, gl.vec3.fromValues(0, 1, 0));
	return a < THRESHOLD || a > Math.PI - THRESHOLD;

}

export function parallelToZ(vec: Vector3D): boolean {
	const a = gl.vec3.angle(vec, gl.vec3.fromValues(0, 0, 1));
	return a < THRESHOLD || a > Math.PI - THRESHOLD;
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
 * Performs a parallel translation orthogonal to the screen (aka paging).
 * The sliding amount is determined according to the current section orientation.
 * When the section seems to be orthogonal to one of the axes, this performs a
 * voxel-by-voxel sliding. Otherwise, the sliding is done by a millimeter resolution.
 */
export function orientationAwareTranslation(section, voxelSize: Vector3D, step: number = 1): Section {
	const orientation = detectOrthogonalSection(section);
	let delta: Vector3D;
	switch (orientation) {
		case 'axial':
			delta = [0, 0, voxelSize[2] * step];
			break;
		case 'sagittal':
			delta = [voxelSize[0] * step, 0, 0];
			break;
		case 'coronal':
			delta = [0, voxelSize[1] * step, 0];
			break;
		default:
			delta = gl.vec3.create() as Vector3D;
			gl.vec3.cross(delta, section.xAxis, section.yAxis);
			gl.vec3.normalize(delta, delta);
			gl.vec3.scale(delta, delta, step);
	}
	section = translateSection(section, delta);
	return section;
}


/**
 * Calculates the scale factor relative to the screen pixel
 * @returns The calculated scale factor, where 1 = pixel by pixel, 2 = 200%, 0.5 = 50%
 */
export function calculateScaleFactor(section: Section, mmDim: Vector3D): number {
	return mmDim[0] / section.xAxis[0];
}

/**
 * Calculates the "fit-to-the-viewer" initial view state section.
 * @param resolution The target viewer size in screen pixels
 * @param volumeSize The target volume size in millimeters
 * @param orientation The orthogonal section
 * @param position The position in the axis orthogonal to the screen
 * @returns {Section}
 */
export function createOrthogonalMprSection(
	resolution: Vector2D,
	volumeSize: Vector3D,
	orientation: OrientationString = 'axial',
	position?: number
): Section {
	const aspect = resolution[0] / resolution[1];
	let section: Section;
	switch (orientation) {
		case 'axial':
			if (typeof position === 'undefined') position = volumeSize[2] / 2;
			if (aspect >= 1.0) {
				section = {
					origin: [0, -( volumeSize[0] - volumeSize[1] ) / 2, position],
					xAxis: [volumeSize[0], 0, 0],
					yAxis: [0, volumeSize[1] * aspect, 0]
				};
			} else {
				section = {
					origin: [-( volumeSize[1] - volumeSize[0] ) / 2, 0, position],
					xAxis: [volumeSize[0] * aspect, 0, 0],
					yAxis: [0, volumeSize[1], 0]
				};
			}
			break;
		case 'sagittal':
			if (typeof position === 'undefined') position = volumeSize[0] / 2;
			if (aspect >= 1.0) {
				section = {
					origin: [position, 0, 0],
					xAxis: [0, volumeSize[1], 0],
					yAxis: [0, 0, volumeSize[2] * aspect]
				};
			} else {
				section = {
					origin: [-( volumeSize[1] - volumeSize[0] ) / 2, 0, volumeSize[2] / 2],
					xAxis: [volumeSize[0] * aspect, 0, 0],
					yAxis: [0, volumeSize[1], 0]
				};
			}
			break;
		case 'coronal':
			if (typeof position === 'undefined') position = volumeSize[1] / 2;
			if (aspect >= 1.0) {
				section = {
					origin: [0, position, 0],
					xAxis: [volumeSize[0], 0, 0],
					yAxis: [0, 0, volumeSize[2] * aspect]
				};
			} else {
				section = {
					origin: [-( volumeSize[1] - volumeSize[0] ) / 2, 0, volumeSize[2] / 2],
					xAxis: [volumeSize[0] * aspect, 0, 0],
					yAxis: [0, volumeSize[1], 0]
				};
			}
			break;
		default:
			throw new TypeError('Unsupported orientation');
	}
	return section;

}

