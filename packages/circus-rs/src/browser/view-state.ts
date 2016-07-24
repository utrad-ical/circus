import { ImageSource } from './image-source/image-source';
import * as gl from 'gl-matrix';

/**
 * ViewWindow determines how each pixel value is assined
 * to grayscale values on screens.
 */
interface ViewWindow {
	level: number;
	width: number;
}

/**
 * Section determines the MRP section of a volume.
 */
interface Section {
	origin: [number, number, number];
	xAxis: [number, number, number]; // in millimeters
	yAxis: [number, number, number]; // in millimeters
}

/**
 * ViewState determines how the ImageSource is viewed on each Viewer.
 */
export interface ViewState {
	section?: Section;
	window?: ViewWindow;
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
