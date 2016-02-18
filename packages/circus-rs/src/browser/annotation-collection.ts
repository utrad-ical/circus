'use strict';
import { Annotation } from './annotation';
import { EventEmitter } from 'events';
import { Viewer } from './viewer';

export class AnnotationCollection extends EventEmitter {
	private lastId: number = -1;
	private collection: Annotation[];

	constructor(){
		super();
		this.collection = [];
	}
	public append (annotation: Annotation): number {
		annotation.setId( ++this.lastId );
		this.collection.push( annotation );
		this.emit("append", this.collection);
		return this.lastId;
	}
	public remove(id: number): boolean{
		this.collection[id] = null;
		return true;
	}
	public forEach(f: Function): void {
		for( var i in this.collection ){
			if( f(this.collection[i]) === false ) break;
		};
	}
	public getAnnotationById(id: number): Annotation{
		if(this.collection[id]) {
			return this.collection[id];
		} else {
			return null;
		}
	}
}
