'use strict';

import { ViewerEvent } from '../viewer-event';
import { Sprite } from '../sprite';
import { Tool } from '../tool';

export class ToolSprite extends Sprite {
	private parent: Tool;
	constructor(parent: Tool) {
		super();
		this.parent = parent;
	}
	public hitTest(event: ViewerEvent): boolean{
		return this.parent.isOnTheToolImage(event.canvasX, event.canvasY);
	}
	public mousedownHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		return false;
	}
	public mouseupHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		console.log("hit");
		//set background event capture
		viewerEvent.viewer.clearBackgroundEventCapture();
		viewerEvent.original.target.style.cursor = this.parent.cursor;
		viewerEvent.viewer.setBackgroundEventCapture(this.parent);
		return false;
	}
}