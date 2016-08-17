import { ImageSource } from './image-source/image-source';
import * as gl from 'gl-matrix';

/**
 * ViewWindow determines how each pixel value is assined
 * to grayscale values on screens.
 */
export interface ViewWindow {
	level: number;
	width: number;
}

/**
 * Section determines the MRP section of a volume.
 */
export interface Section {
	origin: [number, number, number];
	xAxis: [number, number, number]; // in millimeters
	yAxis: [number, number, number]; // in millimeters
}

export interface ZoomAttributes {
	x: number;
	y: number;
	z: number;
	value: number;
}

/**
 * ViewState determines how the ImageSource is viewed on each Viewer.
 */
export interface ViewState {
	section?: Section;
	window?: ViewWindow;
	zoom?: ZoomAttributes; // deprecated! don't use this!
};

/**
 * Investigates the sectin orientation and detects if the section
 * is (almost) orthogonal to one of the three axes.
 * @return One of 'axial', 'sagittal', 'coronal' or 'oblique'
 */
export function detectOrthogonalSection(section: Section): string {
	const { xAxis, yAxis } = section;
	if (parallelToX(xAxis) && parallelToY(yAxis)) return 'axial';
	if (parallelToY(xAxis) && parallelToZ(yAxis)) return 'sagittal';
	if (parallelToX(xAxis) && parallelToZ(yAxis)) return 'coronal';
	return 'oblique';
}

const THRESHOLD = 0.0001;

export function parallelToX(vec: number[]): boolean {
	const a = gl.vec3.angle(vec, gl.vec3.fromValues(1, 0, 0));
	return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

export function parallelToY(vec: number[]): boolean {
	const a = gl.vec3.angle(vec, gl.vec3.fromValues(0, 1, 0));
	return a < THRESHOLD || a > Math.PI - THRESHOLD;

}

export function parallelToZ(vec: number[]): boolean {
	const a = gl.vec3.angle(vec, gl.vec3.fromValues(0, 0, 1));
	return a < THRESHOLD || a > Math.PI - THRESHOLD;
}

export function getVolumePos(section: Section, viewport: [number, number],
	x: number, y: number): [number, number, number]
{
	const [w, h] = viewport;
	const [ox, oy, oz] = section.origin;
	const [ux, uy, uz] = section.xAxis.map(i => i / w);
	const [vx, vy, vz] = section.yAxis.map(i => i / h);

	return [
		ox + ux * x + vx * y,
		oy + uy * x + vy * y,
		oz + uz * x + vz * y
	];
}

export function translateSection(section: Section, delta: number[]): Section
{
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
