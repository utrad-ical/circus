import { ImageSource } from './image-source/image-source';
import * as gl from 'gl-matrix';

export interface ViewState {
	// viewport?: [number, number, number];
	// resolution: [number, number];
	section?: Section;
	window?: ViewWindow;
};

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
