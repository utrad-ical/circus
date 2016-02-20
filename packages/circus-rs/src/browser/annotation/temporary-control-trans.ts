'use strict';

import { EventEmitter } from 'events';
import { Sprite } from '../sprite';
import { Annotation } from './annotation';
import { SimpleSprite } from './temporary-simple-sprite';
import { ViewState } from '../view-state';
import { ViewerEvent } from '../viewer-event';

export class ControlTransAnnotation extends Annotation {

	private emitter: EventEmitter;
	private left: number;
	private top: number;
	private size: number;
	private color: string;
	private dxyz: [number, number, number];

	constructor(
		dx: number, dy: number, dz: number,
		left: number, top: number, size: number, color: string
	){
		super();

		this.left = left;
		this.top = top;
		this.size = size;
		this.color = color;
		this.dxyz = [dx, dy, dz];

		this.emitter = new EventEmitter();
		this.on( 'mousewheel', ( ev )=> {
			if(	ev.original && ev.original.deltaY != 0 ){
				if( ev.original.deltaY > 0 ){
					ev.viewer.getViewState().transrate(-dx, -dy, -dz);
				}else{
					ev.viewer.getViewState().transrate(dx, dy, dz);
				}
				ev.viewer.render();
			}
		});
	}

	public hitTest( event: ViewerEvent ): boolean {
		return this.left <= event.canvasX && event.canvasX <= (this.left + this.size)
			 && this.top <= event.canvasY && event.canvasY <= (this.top + this.size);
	}

	public draw( canvasDomElement:HTMLCanvasElement, viewState:ViewState ):Sprite {
		var context = canvasDomElement.getContext('2d');
		context.fillStyle = this.color;
		context.fillRect( this.left, this.top, this.size, this.size );
		return new SimpleSprite( this );
	}

	public on( type: string, handler: Function ) {
		this.emitter.on.call( this, type, handler );
	}

	public emit( ...args:any[] ) {
		this.emitter.emit.apply( this, args );
	}
	public mousedownHandler(viewerEvent: ViewerEvent): boolean{
		return true;
	}
	public mouseupHandler(viewerEvent: ViewerEvent): boolean{
		return true;
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): boolean{
		return true;
	}
	public mousewheelHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		if(	viewerEvent.original && viewerEvent.original.deltaY != 0 ){
			let [dx,dy,dz] = this.dxyz;
			if( viewerEvent.original.ctrlKey ){
				dx *= 10;
				dy *= 10;
				dz *= 10;
			}
			if( viewerEvent.original.deltaY > 0 ){
				viewerEvent.viewer.getViewState().transrate(-dx, -dy, -dz);
			}else{
				viewerEvent.viewer.getViewState().transrate(dx, dy, dz);
			}
			viewerEvent.viewer.render();
		}
		return false;
	}
}
