'use strict';

import { EventEmitter } from 'events';

import { ViewerEvent } from './viewer-event'
import { ViewerEventCapture } from './viewer-event-capture-interface'

type Capturing = boolean;

export class Tool extends EventEmitter implements ViewerEventCapture {
	public mouseupHandler(viewerEvent: ViewerEvent): Capturing {
		return true;
	}
	public mousedownHandler(viewerEvent: ViewerEvent): Capturing {
		return true;
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): Capturing {
		return true;
	}
	public mousewheelHandler(viewerEvent: ViewerEvent): Capturing {
		return true;
	}
}
