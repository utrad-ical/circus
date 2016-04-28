'use strict';

import { ImageSource } from '../image-source';

export class EmptyImageSource extends ImageSource {

	public draw( canvasDomElement, viewState ):Promise<any> {
		return Promise.resolve();
	}
}
