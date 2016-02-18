'use strict';

import { Composition } from './composition';
import { Sprite } from './sprite';
import { ImageSource } from './image-source';
import { AnnotationCollection } from './annotation-collection';
import { ViewerEvent } from './viewer-event';
import { ViewState } from './view-state';
import { ViewerEventCapture } from './viewer-event-capture-interface';

import { EventEmitter } from 'events';

interface CanvasSize {
	width: number;
	height: number;
}

export class Viewer extends EventEmitter {

	private canvasDomElement: HTMLCanvasElement;
	private canvasDomElementSize: CanvasSize;
	private composition: Composition;

	private viewState: ViewState;
	private imageSource: ImageSource;
	private annotationCollection: AnnotationCollection;
	private currentAnnotationId: number = 0;
	private spriteCollection: Sprite[];

	private primaryEventCapture;
	private backgroundEventCapture;

	constructor(canvas: HTMLCanvasElement) {
	super();

	let self = this;
	self.canvasDomElement = canvas;
	self.canvasDomElementSize = {
		width: parseInt( canvas.getAttribute('width') ),
		height: parseInt( canvas.getAttribute('height') )
	};
	self.spriteCollection = [];
	self.composition = null;

	var eventDrive = ( originalEvent ) => {
		self.canvasEventHandler( originalEvent );
	};
	var wheelEvent = 'onwheel' in document ? 'wheel' : 'onmousewheel' in document ? 'mousewheel' : 'DOMMouseScroll';

	canvas.addEventListener('mousedown', eventDrive);
	canvas.addEventListener('mouseup', eventDrive);
	canvas.addEventListener('mousemove', eventDrive);
	canvas.addEventListener( wheelEvent, eventDrive);
	}
	private getViewerEvent( type, domEvent ){
		return new ViewerEvent( this, type, domEvent );
	}

	public appendToComposition( composition ){
		this.composition = composition;
	}
	public getComposition(): Composition {
		if( this.composition === null ){
			this.composition = new Composition();
		}
		return this.composition;
	}

	public setImageSource( imageSource: ImageSource ): void {
		this.getComposition().setImageSource( imageSource );
	}
	public getImageSource(): ImageSource {
		return this.getComposition().getImageSource();
	}
	public getAnnotationCollection(): AnnotationCollection {
		return this.getComposition().getAnnotationCollection();
	}
	public setAnnotationCollection( annotationCollection ): void {
		this.getComposition().setAnnotationCollection( annotationCollection );
	}
	public getCurrentAnnotationId(): number{
		return this.currentAnnotationId;
	}
	public setCurrentAnnotationId(id: number): void{
		this.currentAnnotationId = id;
	}
	public setAnnotationHandler(type: string, func: Function): void{
		let anoCol = this.getAnnotationCollection();
		anoCol.on(type, func);
	}
	public setViewState( viewState ) {
		this.viewState = viewState;
	}
	public getViewState() : ViewState {
		return this.viewState;
	}
	public setPrimaryEventCapture( capture: ViewerEventCapture ): void {
		this.primaryEventCapture = capture;
	}
	public clearPrimaryEventCapture(): void {
		this.primaryEventCapture = null;
	}
	public setBackgroundEventCapture( capture: ViewerEventCapture ): void {
		this.backgroundEventCapture = capture;
	}
	public clearBackgroundEventCapture(): void {
		this.backgroundEventCapture = null;
	}

	private canvasEventHandler( originalEvent ){
	if( typeof originalEvent === 'object' && originalEvent.preventDefault ) originalEvent.preventDefault();

	var eventType = originalEvent.type;
	let handler;
	switch( eventType ){
		case 'mousemove':
			handler = 'mousemoveHandler';
			break;
		case 'mouseup':
			handler = 'mouseupHandler';
			break;
		case 'mousedown':
			handler = 'mousedownHandler';
			break;
		case 'wheel':
		case 'mousewheel':
		case 'DOMMouseScroll':
			eventType = 'mousewheel';
			handler = 'mousewheelHandler';
			break;
	}

	var event = new ViewerEvent( this, eventType, originalEvent );

	if( this.primaryEventCapture && ! this.primaryEventCapture[handler]( event ) ) return;

	for( var i = this.spriteCollection.length; i > 0; i-- ){
		if( ! (this.spriteCollection[i-1])[handler]( event ) ) return;
		}
		if(this.backgroundEventCapture && !this.backgroundEventCapture[handler]( event ) ) return;
		}

	public clear(): void {
		this.canvasDomElement.getContext('2d').clearRect(
			0,0,
			this.canvasDomElementSize.width, this.canvasDomElementSize.width
		);
	}

	public draw( drawFunction: Function ): void {
		var sprite:Sprite = drawFunction( this.canvasDomElement, this.viewState );
		if( sprite !== null ) this.spriteCollection.push( sprite );
	}

	public render(): Promise<any> {
		let self = this;

		self.clear();

		self.spriteCollection = [];

		return self.getImageSource().draw( self.canvasDomElement, self.viewState )
		.then( function(){
			var annotationCollection = self.getAnnotationCollection();
			annotationCollection.forEach( function( annotation ){
				var sprite:Sprite = annotation.draw( self.canvasDomElement, self.viewState );
				if( sprite !== null ) self.spriteCollection.push( sprite );
			});
		}).then( ()=>{
			var event = new ViewerEvent( this, 'render' );
			this.emit('render', event);
		});
	}
}
