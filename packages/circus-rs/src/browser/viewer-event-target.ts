'use strict'

import { ViewerEvent } from './viewer-event'

export interface ViewerEventTarget {
	mouseupHandler: (viewerEvent: ViewerEvent) => any;
	mousedownHandler: (viewerEvent: ViewerEvent) =>  any;
	mousemoveHandler: (viewerEvent: ViewerEvent) =>  any;
	mousewheelHandler: (viewerEvent: ViewerEvent) =>  any;
}
