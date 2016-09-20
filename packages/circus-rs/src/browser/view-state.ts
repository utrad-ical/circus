import { ImageSource } from './image-source/image-source';
import { Section } from '../common/geometry';

/**
 * ViewWindow determines how each pixel value is assined
 * to grayscale values on screens.
 */
export interface ViewWindow {
	level: number;
	width: number;
}

/**
 * ViewState determines how the ImageSource is viewed on each Viewer.
 */
export interface ViewState {
	section?: Section;
	window?: ViewWindow;
}

