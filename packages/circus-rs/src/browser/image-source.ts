'use strict';

import { EventEmitter } from 'events';

export abstract class ImageSource extends EventEmitter {
	public abstract draw( canvasDomElement, viewState ):Promise<any>;
}
