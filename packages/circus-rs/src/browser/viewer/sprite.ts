'use strict';

import { ViewerEvent }					from '../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../browser/interface/viewer-event-target';

export class Sprite implements ViewerEventTarget {
	public mouseupHandler(viewerEvent: ViewerEvent) {}
	public mousedownHandler(viewerEvent: ViewerEvent) {}
	public mousemoveHandler(viewerEvent: ViewerEvent) {}
	public mousewheelHandler(viewerEvent: ViewerEvent) {}
}
