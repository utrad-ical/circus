'use strict';

import { EventEmitter } from 'events';

import { PromiseDefer }					from '../../browser/util/promise-defer';
import { Painter }						from '../../browser/interface/painter';
import { Sprite }						from '../../browser/viewer/sprite';
import { ImageSource }					from '../../browser/image-source/image-source';
import { ViewerEvent }					from '../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../browser/interface/viewer-event-target';

function extend(...arg:any[]) {
	arg.unshift(true);
	return jQuery.extend.apply( jQuery, arg );
};

export class Viewer extends EventEmitter {

	public canvasDomElement: HTMLCanvasElement;

	public viewState: any;
	public imageSource: ImageSource;
	public painters: Painter[];
	public sprites: Sprite[];

	public primaryEventTarget;
	public backgroundEventTarget;
	
	private queue: PromiseDefer[];
	private rendering: boolean = false;

	constructor( canvas: HTMLCanvasElement ) {
		super();

		this.canvasDomElement = canvas;
		this.painters = [];
		this.sprites = [];

		let eventDrive = ( originalEvent ) => {
			this.canvasEventHandler( originalEvent );
		};
		
		let wheelEvent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
		canvas.addEventListener('mousedown', eventDrive);
		canvas.addEventListener('mouseup', eventDrive);
		canvas.addEventListener('mousemove', eventDrive);
		canvas.addEventListener( wheelEvent, eventDrive);
		
		this.queue = [];
	}
	
	public getResolution(){
		return [
			Number( this.canvasDomElement.getAttribute( 'width' ) ),
			Number( this.canvasDomElement.getAttribute( 'height' ) )
		];
	}
	public setResolution( w, h ){
		this.canvasDomElement.setAttribute( 'width', w );
		this.canvasDomElement.setAttribute( 'height', h );
	}
	
	public addPainter( p: Painter ){
		this.painters.push( p );
	}
	public removePainter( p: Painter ){
		let currentCount = this.painters.length;
		this.painters = this.painters.filter( (i) => ( i !== p ) );
		return this.painters.length !== currentCount;
	}
	

	private canvasEventHandler( originalEvent ){
		if( typeof originalEvent === 'object' && originalEvent.preventDefault ){
			originalEvent.preventDefault();
		}

		let eventType = originalEvent.type;
		switch( eventType ){
			case 'mousemove':
			case 'mouseup':
			case 'mousedown':
				break;
			case 'wheel':
			case 'mousewheel':
			case 'DOMMouseScroll':
				eventType = 'mousewheel';
				break;
		}

		let event = new ViewerEvent( this, eventType, originalEvent );
		if( this.primaryEventTarget ) event.dispatch( this.primaryEventTarget );
		for( let i = this.sprites.length; i > 0; i-- ){
			event.dispatch( this.sprites[i-1] );
		}
		if( this.backgroundEventTarget ) event.dispatch( this.backgroundEventTarget );
	}
	
	public createEvent( eventType, originalEvent? ){
		return new ViewerEvent( this, eventType, originalEvent );
	}

	public clear(): void {
		this.canvasDomElement.getContext('2d').clearRect(
			0,0,
			Number( this.canvasDomElement.getAttribute('width') ),
			Number( this.canvasDomElement.getAttribute('height') )
		);
	}

	public drawBy( painter: Painter ): void {
		let sprite = painter.draw( this.canvasDomElement, this.viewState );
		if(sprite) this.sprites.push( sprite );
	}

	private dequeue(){
		if( this.queue.length > 0 ){
			this.rendering = true;
			let lastOne = this.queue.pop();
			while( this.queue.length > 0 ){
				this.queue.shift()
					.cancel('Rendering skipped', true);
			}
			return lastOne.execute().then( () => {
				this.rendering = false;
				return this.dequeue();
			} );
		}else{
			return Promise.resolve();
		}
	}
	
	private enqueue( defer ){
		this.queue.push( defer );
	}
	
	public render(): Promise<any> {
		
		let state = this.viewState;
		let canvas = this.canvasDomElement;
		
		let defer = new PromiseDefer( () => {
			return (
				this.imageSource && this.imageSource.draw
					? this.imageSource.draw( canvas, state )
					: Promise.resolve()
			).then( () => {
				this.painters.forEach( ( painter ) => {
					let sprite = painter.draw( canvas, state );
					if( sprite !== null ) this.sprites.push( sprite );
				} );
			} );
		} );
		
		this.enqueue( defer );
		if( ! this.rendering ) this.dequeue();
		
		return defer;
	}
	
	public getDimension(){
		console.log('Using Viewer.getDimension is not recommended');
		return this.imageSource.getDimension();
	}
	
	public getViewport(){
		return [
			this.canvasDomElement.clientWidth,
			this.canvasDomElement.clientHeight
		];
	}
	
	/**
	 * State handling methods
	 */
	public setState( state ){
		
		// state.section.origin = [
			// Math.floor( state.section.origin[0] ),
			// Math.floor( state.section.origin[1] ),
			// Math.floor( state.section.origin[2] ),
		// ];
		// state.section.xAxis = [
			// Math.floor( state.section.xAxis[0] ),
			// Math.floor( state.section.xAxis[1] ),
			// Math.floor( state.section.xAxis[2] ),
		// ];
		// state.section.yAxis = [
			// Math.floor( state.section.yAxis[0] ),
			// Math.floor( state.section.yAxis[1] ),
			// Math.floor( state.section.yAxis[2] ),
		// ];
		
		let prevState = extend( {}, this.viewState );
		this.viewState = extend( {}, state );
		this.emit( 'statechange', prevState, state );
		return prevState;
	}
	public getState(){
		return extend( {}, this.viewState );
	}
	
	/**
	 * ImageSource handling methods
	 */
	public setSource( source: ImageSource ){
		let prevSource = this.imageSource;
		this.imageSource = source;
		this.emit( 'sourcechange', prevSource, source );
		return prevSource;
	}
	public getSource(){
		return this.imageSource;
	}
	
}

