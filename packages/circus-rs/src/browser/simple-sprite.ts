'use strict';

import { ViewerEvent } from './viewer-event';
import { Sprite } from './sprite';

// Note: Use any because generic can't have method.

export class SimpleSprite extends Sprite {

	private parent: any;

	constructor( parent: any ){

	this.parent = parent;

	super();
	this.on('mouseup', this.mouseupHandler);
	this.on('mousedown', this.mousedownHandler);
	this.on('mousemove', this.mousemoveHandler);
	this.on('mousewheel', this.mousewheelHandler);
  }
  public hitTest( event:ViewerEvent ):boolean {
	return this.parent.hitTest( event );
  }
  private mouseupHandler(viewerEvent: ViewerEvent): void {
	return this.parent.emit( 'mouseup', viewerEvent );
  }
  private mousedownHandler(viewerEvent: ViewerEvent): void {
	return this.parent.emit( 'mousedown', viewerEvent );
  }
  private mousemoveHandler(viewerEvent: ViewerEvent): void {
	return this.parent.emit( 'mousemove', viewerEvent );
  }
  private mousewheelHandler(viewerEvent: ViewerEvent): void {
	return this.parent.emit( 'mousewheel', viewerEvent );
  }
}
