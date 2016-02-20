'use strict';

import { ViewerEvent } from '../viewer-event';
import { Sprite } from '../sprite';

// Note: Use any because generic can't have method.

export class SimpleSprite extends Sprite {

	private parent: any;

	constructor( parent: any ){
		super();
		this.parent = parent;
	}
	public mouseupHandler(viewerEvent: ViewerEvent): boolean {
		return this.parent.mouseupHandler( viewerEvent );
	}
	public mousedownHandler(viewerEvent: ViewerEvent): boolean {
		return this.parent.mousedownHandler( viewerEvent );
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): boolean {
		return this.parent.mousemoveHandler( viewerEvent );
	}
	public mousewheelHandler(viewerEvent: ViewerEvent): boolean {
		return this.parent.mousewheelHandler( viewerEvent );
	}
}
