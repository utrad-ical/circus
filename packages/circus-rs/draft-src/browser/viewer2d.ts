'use strict';

import { Painter } from './painter-interface';
import { Composition } from './composition';
import { Sprite } from './sprite';
import { ImageSource } from './image-source';
import { AnnotationCollection } from './annotation-collection';
import { ViewerEvent } from './viewer-event';
import { ViewerEventCapture } from './viewer-event-capture-interface';

import { EventEmitter } from 'events';

export class Viewer2D extends EventEmitter {

	private canvasDomElement: HTMLCanvasElement;

	private viewState: any;
	private imageSource: ImageSource;
	private annotationCollection: AnnotationCollection;
	private spriteCollection: Sprite[];

	private primaryEventCapture;
	private backgroundEventCapture;

	constructor( canvas: HTMLCanvasElement ) {
		super();

		let self = this;
		self.canvasDomElement = canvas;
		self.spriteCollection = [];

		var eventDrive = ( originalEvent ) => {
			self.canvasEventHandler( originalEvent );
		};
		
		let wheelEvent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';
		canvas.addEventListener('mousedown', eventDrive);
		canvas.addEventListener('mouseup', eventDrive);
		canvas.addEventListener('mousemove', eventDrive);
		canvas.addEventListener( wheelEvent, eventDrive);
	}

	public setPrimaryEventCapture( capture: ViewerEventCapture ): void {
		// if( this.primaryEventCapture ) this.primaryEventCapture.emit('some signal ?');
		this.primaryEventCapture = capture;
	}
	public clearPrimaryEventCapture(): void {
		// if( this.primaryEventCapture ) this.primaryEventCapture.emit('some signal ?');
		this.primaryEventCapture = null;
	}
	public setBackgroundEventCapture( capture: ViewerEventCapture): void {
		// if( this.backgroundEventCapture ) this.backgroundEventCapture.emit('some signal ?');
		this.backgroundEventCapture = capture;
	}
	public clearBackgroundEventCapture(): void {
		// if( this.backgroundEventCapture ) this.backgroundEventCapture.emit('some signal ?');
		this.backgroundEventCapture = null;
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

		let event = new ViewerEvent( this, eventType );
		if( this.primaryEventCapture ) event.dispatch( this.primaryEventCapture );
		for( let i = this.spriteCollection.length; i > 0; i-- ){
			event.dispatch( this.toolSpriteCollection[i] );
		}
		if( this.backgroundEventCapture ) event.dispatch( this.backgroundEventCapture );
	}

	public clear(): void {
		this.canvasDomElement.getContext('2d').clearRect(
			0,0,
			Number( this.canvasDomElement.getAttribute('width') ),
			Number( this.canvasDomElement.getAttribute('height') )
		);
	}

	public drawBy( painter: Painter ): void {
		painter.draw( this.canvasDomElement, this.viewState );
		var sprite = painter.draw( this.canvasDomElement, this.viewState );
		if( sprite){
			if(!(sprite instanceof ToolSprite)) {
				this.spriteCollection.push( sprite );
			}
		}
	}

	public render(): Promise<any> {
		let self = this;

		self.spriteCollection = [];
		self.clear();

		return self.getImageSource().draw( self.canvasDomElement, self.viewState )
		.then( function(){
			var annotationCollection = self.getAnnotationCollection();
			annotationCollection.forEach( function( painter ){
				var sprite = painter.draw( self.canvasDomElement, self.viewState );
				if( sprite !== null ) self.spriteCollection.push( sprite );
			});
		}).then( ()=>{
			var event = new ViewerEvent( this, 'render' );
			this.emit('render', event );
		});
	}
}
