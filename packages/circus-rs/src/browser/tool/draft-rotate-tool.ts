"use strict";

import { ViewerEvent } from '../viewer-event'
import { VolumeViewState } from '../volume-view-state'
import { ViewerEventCapture } from '../viewer-event-capture-interface'
import { Tool } from './draft-tool'

export class RotateTool extends Tool {
	private dxyz: [number, number, number];
	constructor(opt, dx: number, dy: number, dz: number) {
		super(opt);
		this.dxyz = [dx, dy, dz];
	}
	public mousewheelHandler(viewerEvent: ViewerEvent): boolean{
		if( viewerEvent.original.deltaY > 0 ){
			viewerEvent.viewer.getVolumeViewState().rotate(5, [this.dxyz[0], this.dxyz[1], this.dxyz[2]]);
		}else{
			viewerEvent.viewer.getVolumeViewState().rotate(-5, [this.dxyz[0], this.dxyz[1], this.dxyz[2]]);
		}
		viewerEvent.viewer.render();
		return false;
	}
}