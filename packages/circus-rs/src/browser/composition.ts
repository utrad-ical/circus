import { EventEmitter } from 'events';

import { Annotation } from '../browser/annotation/annotation';
import { ImageSource } from '../browser/image-source/image-source';
import { Viewer } from '../browser/viewer/viewer';
import { ViewerEvent } from '../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../browser/interface/viewer-event-target';

import { Tool } from '../browser/tool/tool';
import { WindowTool } from '../browser/tool/state/window';
import { HandTool } from '../browser/tool/state/hand';
import { CelestialRotateTool } from '../browser/tool/state/celestial-rotate';
import { BrushTool } from '../browser/tool/cloud/brush';

/**
 * A composition is a combination of one imageSource and
 * an arbitrary number of annotations.
 */
export class Composition extends EventEmitter {

	public imageSource: ImageSource;
	private viewers: Viewer[] = [];

	/**
	 * List of annotations associated with this composition.
	 */
	private annotations: Annotation[] = []; // TODO: Change to ES6 Set<Annotation>

	// public clouds: VoxelCloud[] = [];
	// private cloudEditor: CloudEditor;

	constructor() {
		super();

		// //
		// // Cloud edit tools
		// //
		// this.cloudEditor = new CloudEditor();
		//
		// // brush tool
		// let brush = new BrushTool();
		// brush.cloudEditor = this.cloudEditor;
		// brush.on('penup', () => {
		// 	this.renderAll();
		// });
		// this.tools['Brush'] = brush
		//
		// // bucket tool
		// let bucket = new BucketTool();
		// bucket.cloudEditor = this.cloudEditor;
		// bucket.on('filled', () => {
		// 	this.renderAll();
		// });
		// this.tools['Bucket'] = bucket
		//
		// /**
		//  * set up painter
		//  */
		// let cloudsRenderer = new CloudsRenderer();
		// cloudsRenderer.clouds = this.clouds;
		// this.annotations.push(cloudsRenderer);

	}

	// public editCloud(cloud: VoxelCloud) {
	// 	this.cloudEditor.setCloud(cloud);
	// }

	public setImageSource(imageSource: ImageSource) {
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
		this.viewers.concat(viewer);
	}

	/**
	 * Removes a viewer to the internal list.
	 * This method will be called automatically by a viewer.
	 * End-users should not call this manually.
	 */
	public unregisterViewer(viewer: Viewer): void {
		this.viewers = this.viewers.filter(v => v !== viewer);
	}

	public addAnnotation(annotation: Annotation): void {
		this.annotations.push(annotation);
	}

	public getAnnotations(): Annotation[] {
		// TODO: change to Iterator<Annotation>
		return this.annotations;
	}

}
