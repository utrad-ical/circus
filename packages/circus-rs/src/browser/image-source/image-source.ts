'use strict';

import { EventEmitter } from 'events';

/**
 * ImageSource is an abstract class which represents a
 * 2D or 3D image from any source and draws it onto a given canvas.
 */
export abstract class ImageSource extends EventEmitter {
	public abstract draw(canvasDomElement, viewState): Promise<any>;

	public abstract ready(): Promise<any>;

	public state(): any {
		return {};
	}
}
