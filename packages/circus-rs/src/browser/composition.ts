import { EventEmitter } from 'events';
import { Annotation } from '../browser/annotation/annotation';
import { ImageSource } from '../browser/image-source/image-source';
import { Viewer } from '../browser/viewer/viewer';

/**
 * A composition is a combination of one imageSource and
 * an arbitrary number of annotations.
 */
export class Composition extends EventEmitter {
	/**
	 * The image source that is associated with this composition.
	 * Do not modify this directly: Use the acccessor methods instead.
	 */
	public imageSource: ImageSource;

	/**
	 * List of viewers that are associated with this composition.
	 * Do not modify this directly: Use the acccessor methods instead.
	 */
	public viewers: Viewer[] = [];
	
	/**
	 * List of annotations that are associated with this composition.
	 * Do not modify this directly: Use the acccessor methods instead.
	 */
	public annotations: Annotation[] = [];

	public setImageSource(imageSource: ImageSource) {
		if (this.imageSource === imageSource) return;
		this.imageSource = imageSource;
		this.emit('sourceChange');
	}

	/**
	 * Adds a viewer to the internal list.
	 * This method will be called automatically by a viewer.
	 * End-users should not call this manually.
	 */
	public registerViewer(viewer: Viewer): void {
		if (this.viewers.some(v => v === viewer)) return;
		this.emit('viewerChange');
		this.viewers.push(viewer);
	}

	/**
	 * Removes a viewer from the internal list.
	 * This method will be called automatically by a viewer.
	 * End-users should not call this manually.
	 */
	public unregisterViewer(viewer: Viewer): void {
		if (this.viewers.every(v => v !== viewer)) return;
		this.viewers = this.viewers.filter(v => v !== viewer);
		this.emit('viewerChange');
	}

	/**
	 * Adds an annotation to this composition.
	 */
	public addAnnotation(annotation: Annotation): void {
		if (this.annotations.some(a => a === annotation)) return;
		this.annotations.push(annotation);
		this.emit('annotationChange');
	}
	
	/**
	 * Removes an annotation from this composition.
	 */
	public removeAnnotation(annotation: Annotation): void {
		if (this.annotations.every(a => a !== annotation)) return;
		this.annotations = this.annotations.filter(a => a !== annotation);
		this.emit('annotationChange');
	}

}
