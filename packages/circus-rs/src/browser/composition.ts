'use strict';

import { AnnotationCollection } from './annotation-collection';
import { Annotation } from './annotation/annotation';
import { ImageSource } from './image-source';

export class Composition {

	private imageSource: ImageSource;
	private annotationCollection: AnnotationCollection;

	constructor(){
		this.annotationCollection = new AnnotationCollection();
		this.imageSource = null;
	}

	public getImageSource():ImageSource{
		return this.imageSource;
	}
	public setImageSource( imageSource: ImageSource): void {
		this.imageSource = imageSource;
	}
	public getAnnotationCollection():AnnotationCollection{
		return this.annotationCollection;
	}
	public setAnnotationCollection( annotationCollection ): void {
		this.annotationCollection = annotationCollection;
	}
	public appendAnnotation( annotation: Annotation ): void {
		this.annotationCollection.append( annotation );
	}
}