'use strict';
import { Annotation } from './annotation';
export class AnnotationCollection {
	private collection: Annotation[];
	constructor(){
		this.collection = [];
	}
	public append (annotation: Annotation): void {
		this.collection.push( annotation );
	}
	public forEach(f: Function): void {
		for( var i in this.collection ){
			if( f(this.collection[i]) === false ) break;
		};
	}
}
