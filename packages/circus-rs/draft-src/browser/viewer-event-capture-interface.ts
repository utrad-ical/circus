'use strict'

import { ViewerEvent } from './viewer-event'
type Capturing = boolean;

export interface ViewerEventCapture {
	// hitTest: ( event:ViewerEvent ) => boolean;
	// on: (eventType: string, ...args: any[]) => void;
	// emit: (eventType: string, ...args: any[]) => boolean;
	mouseupHandler: (viewerEvent: ViewerEvent) => Capturing;
	mousedownHandler: (viewerEvent: ViewerEvent) =>  Capturing;
	mousemoveHandler: (viewerEvent: ViewerEvent) =>  Capturing;
	mousewheelHandler: (viewerEvent: ViewerEvent) =>  Capturing;
}
