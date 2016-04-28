'use strict';

import { Painter } from './painter-interface';
import { Sprite } from './sprite';
import { ImageSource } from './image-source';
import { ViewerEvent } from './viewer-event';
import { ViewerEventTarget } from './viewer-event-target';

import { EventEmitter } from 'events';

export class Viewer extends EventEmitter {

	public canvasDomElement: HTMLCanvasElement;

	public viewState: any;
	public imageSource: ImageSource;
	public painters: any[];
	public sprites: Sprite[];

	public primaryEventTarget;
	public backgroundEventTarget;
	
	private loading: boolean;
	private queue: RenderQueue;

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
		
		this.queue = new RenderQueue();
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

	public render(): Promise<any> {

		return this.queue.add( () => {
			
			this.queue.waiting = true;
			this.sprites = [];
			
			let promise = this.imageSource && this.imageSource.draw
				? this.imageSource.draw( this.canvasDomElement, this.viewState )
				: Promise.resolve();
			
			promise.then( () => {
				this.painters.forEach( ( painter ) => {
					let sprite = painter.draw( this.canvasDomElement, this.viewState );
					if( sprite !== null ) this.sprites.push( sprite );
				} );
			} ).then( () => {
				this.queue.waiting = false;
			} );
			
			return promise;
		} );
	}
}

class RenderQueue {
	public waiting: boolean;
	private lastId: number;
	private currentId: number;
	private queue: Function[];
	private timer;
	
	constructor(){
		this.lastId = 0;
		this.currentId = 0;
		this.queue = [];
	}
	public add( f ){
		let id = ++this.lastId;
		let job = new Promise( ( resolve, reject )=>{
			this.queue.push( ()=>{
				if( id === this.currentId ){
					return f().then( ()=>resolve() );
				}else if( id < this.currentId ){
					reject('Rendering skipped');
				}
			} );
		} );
		this.next();
		return job;
	}
	public next(){
		if( this.waiting ){
			if( ! this.timer ) this.timer = setInterval( () => this.next(), 20 );
		}else{
			this.currentId = this.lastId;
			this.queue.forEach( (f) => { f() } );
			this.queue = [];
			if( this.timer ) {
				clearInterval( this.timer );
				this.timer = null;
			}
		}
	}
}