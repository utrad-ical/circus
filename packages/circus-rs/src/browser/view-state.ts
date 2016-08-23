import { ImageSource } from './image-source/image-source';
import { Section } from './section';

/**
 * ViewWindow determines how each pixel value is assined
 * to grayscale values on screens.
 */
export interface ViewWindow {
	level: number;
	width: number;
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
}

