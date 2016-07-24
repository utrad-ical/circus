'use strict';

import { EventEmitter } from 'events';
import { ViewState } from '../view-state';
import { Viewer } from '../viewer/viewer';

/**
 * ImageSource is an abstract class which represents a
 * 2D or 3D image from any source and draws it onto a given canvas.
 */
export abstract class ImageSource extends EventEmitter {
	/**
	 * Draws an image according to the current view state.
	 */
	public abstract draw(viewer: Viewer, viewState: ViewState): Promise<any>;

	/**
	 * Returns a Promise instance which resolves when
	 * preparation task is finished and draw() can be called.
	 */
	public ready(): Promise<any> {
		return Promise.resolve();
	}

	/**
	 * Creates the default view state object which will be used
	 * when the image is firstly loaded to a viewer.
	 */
	public initialState(viewer: Viewer): ViewState {
		return {};
	}
}
