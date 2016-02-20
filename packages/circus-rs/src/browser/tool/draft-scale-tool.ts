"use strict";

import { ViewerEvent } from '../viewer-event'
import { ViewState } from '../view-state'
import { ViewerEventCapture } from '../viewer-event-capture-interface'
import { Tool } from './draft-tool'

export class ScaleTool extends Tool {
	private scale: number = 0;
	constructor(opt, scale: number) {
		super(opt);
		this.scale = scale;
	}
	public hitTest(event: ViewerEvent){
		return true;
	}
	public mousedownHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		return true;
	}
	public mouseupHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		return true;
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		return true;
	}
	public mousewheelHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		let vs = viewerEvent.viewer.getViewState();
		if(viewerEvent.original.deltaY > 0) {
			vs.scale(this.scale);
		} else {
			vs.scale(1.0 / this.scale);
		}
		viewerEvent.viewer.render();
		return false;
	}
}