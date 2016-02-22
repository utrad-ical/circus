"use strict";

import { ViewerEvent } from '../viewer-event'
import { VolumeViewState } from '../volume-view-state'
import { ViewerEventCapture } from '../viewer-event-capture-interface'
import { Tool } from './draft-tool'

export class HandTool extends Tool {
	private isDragging: boolean = false;
	private previousPoint: [number, number] = [0, 0];

	constructor(opt) {
		super(opt);
	}
	public mousedownHandler(viewerEvent: ViewerEvent): boolean{
		this.isDragging = true;
		this.previousPoint = [viewerEvent.canvasX, viewerEvent.canvasY];
		// viewerEvent.original.target.classList.toggle("move_cursor");
		return false;
	}
	public mouseupHandler(viewerEvent: ViewerEvent): boolean{
		this.isDragging = false;
		// viewerEvent.original.target.classList.toggle("move_cursor");
		return false;
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.isDragging) {
			return true;
		}
		let vs = viewerEvent.viewer.getVolumeViewState();
		let distanceX = this.previousPoint[0] - viewerEvent.canvasX;
		let distanceY = this.previousPoint[1] - viewerEvent.canvasY;
		//update previous point
		this.previousPoint[0] = viewerEvent.canvasX;
		this.previousPoint[1] = viewerEvent.canvasY;

		vs.transrate(distanceX, distanceY, 0);
		viewerEvent.viewer.render();
		return false;
	}
	public mousewheelHandler(viewerEvent: ViewerEvent): boolean{
		if(this.isDragging) {//don't translate while dragging
			return false;
		}
		let vs = viewerEvent.viewer.getVolumeViewState();
		if(viewerEvent.original.deltaY > 0) {
			vs.transrate(0, 0, -1);
		} else {
			vs.transrate(0, 0, 1);
		}
		viewerEvent.viewer.render();
		return false;
	}
}