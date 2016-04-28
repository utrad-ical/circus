"use strict";

import { ViewerEvent } from '../viewer-event'
import { VolumeViewState } from '../volume-view-state'
import { ViewerEventCapture } from '../viewer-event-capture-interface'
import { Tool } from './draft-tool'

export class RotateTool extends Tool {
	// private dxyz: [number, number, number];
	constructor(opt) {
		super(opt);
	}
	public mousewheelHandler(viewerEvent: ViewerEvent): boolean{
		let x = 0, y = 0, z = 0;
		switch (viewerEvent.original.target.id) {
			case "rs-canvas"://axial
				z = 1;
				break;
			case "rs-canvas2"://sagital
				x = 1;
				break;
			case "rs-canvas3"://colonal
				y = 1;
				break;
			default:
				z = 1;
				break;
		}
		let vs = viewerEvent.viewer.getViewState();
		if( viewerEvent.original.deltaY > 0 ){
			vs.rotate(5, [x, y, z]);
		}else{
			vs.rotate(-5, [x, y, z]);
		}
		viewerEvent.viewer.render();
		return false;
	}
}