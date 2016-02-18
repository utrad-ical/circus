'use strict';
import { Annotation } from './annotation';
import { EventEmitter } from 'events';
import { Viewer } from './viewer';

export class AnnotationCollection extends EventEmitter {
	private lastId: number = 0;
	private currentAnnotationId: number = 0;
	private collection: Annotation[];

	public setCurrentAnnotationId(id: number): void{
		this.currentAnnotationId = id;
	}
	constructor(){
		super();
		this.collection = [];
	}
	public append (annotation: Annotation): number {
		annotation.setId( this.lastId );
		this.currentAnnotationId = this.lastId;
		this.collection.push( annotation );
		this.lastId++;
		this.emit("append", this.collection);
		return this.currentAnnotationId;
	}
	public remove(id: number): boolean{
		if(this.collection[id] !== null) {
			this.collection[id] = null;
			this.currentAnnotationId = 0;
			return true;
		} else {
			return false;
		}
	}
	public forEach(f: Function): void {
		for( var i in this.collection ){
			if( f(this.collection[i]) === false ) break;
		};
	}
	public getCurrentAnnotation(): Annotation{
		if(this.collection[this.currentAnnotationId]) {
			return this.collection[this.currentAnnotationId];
		} else {
			return null;
		}
	}
	// public getAnnotationById(id: number): Annotation{
	// 	if(this.collection[id]) {
	// 		return this.collection[id];
	// 	} else {
	// 		return null;
	// 	}
	// }
}
