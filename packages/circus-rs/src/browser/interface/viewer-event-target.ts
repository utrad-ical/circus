'use strict';

import { ViewerEvent } from '../../browser/viewer/viewer-event';

export interface ViewerEventTarget {
	mouseUpHandler: (viewerEvent: ViewerEvent) => any;
	mouseDownHandler: (viewerEvent: ViewerEvent) =>  any;
	mouseMoveHandler: (viewerEvent: ViewerEvent) =>  any;
	mouseWheelHandler: (viewerEvent: ViewerEvent) =>  any;
}
