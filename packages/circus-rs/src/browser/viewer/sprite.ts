'use strict';

import { ViewerEvent } from '../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../browser/interface/viewer-event-target';

export class Sprite implements ViewerEventTarget {
	public mouseupHandler(viewerEvent: ViewerEvent): void {
		// do nothing by default
	}

	public mousedownHandler(viewerEvent: ViewerEvent): void {
		// do nothing by default
	}

	public mousemoveHandler(viewerEvent: ViewerEvent): void {
		// do nothing by default
	}

	public mousewheelHandler(viewerEvent: ViewerEvent): void {
		// do nothing by default
	}
}
