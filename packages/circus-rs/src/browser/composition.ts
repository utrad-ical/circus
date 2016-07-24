'use strict';

import { EventEmitter } from 'events';

import { VoxelCloud } from '../common/VoxelCloud';

import { Annotation } from '../browser/annotation/annotation';
import { ImageSource } from '../browser/image-source/image-source';
import { Viewer } from '../browser/viewer/viewer';
import { ViewerEvent } from '../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../browser/interface/viewer-event-target';

import { Tool } from '../browser/tool/tool';
import { WindowTool } from '../browser/tool/state/window';
import { HandTool } from '../browser/tool/state/hand';
import { CelestialRotateTool } from '../browser/tool/state/celestial-rotate';
import { CloudsRenderer } from '../browser/tool/cloud/clouds-renderer';
import { CloudEditor } from '../browser/tool/cloud/cloud-editor';
import { BrushTool } from '../browser/tool/cloud/brush';
import { BucketTool } from '../browser/tool/cloud/bucket';

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

	private tools: any = {}; // { name: string => tool: Tool }
	public clouds: VoxelCloud[] = [];

	private currentToolName: string;

	private cloudEditor: CloudEditor;

	constructor() {
		super();

		/**
		 * set up tools
		 */

		// window tool
		this.tools['Window'] = new WindowTool();

		// hand tool
		this.tools['Hand'] = new HandTool();

		// celestial-rotate tool
		this.tools['CelestialRotate'] = new CelestialRotateTool();

		//
		// Cloud edit tools
		//
		this.cloudEditor = new CloudEditor();

		// brush tool
		let brush = new BrushTool();
		brush.cloudEditor = this.cloudEditor;
		brush.on('penup', () => {
			this.renderAll();
		});
		this.tools['Brush'] = brush

		// bucket tool
		let bucket = new BucketTool();
		bucket.cloudEditor = this.cloudEditor;
		bucket.on('filled', () => {
			this.renderAll();
		});
		this.tools['Bucket'] = bucket

		/**
		 * set up painter
		 */
		let cloudsRenderer = new CloudsRenderer();
		cloudsRenderer.clouds = this.clouds;
		this.annotations.push(cloudsRenderer);

	}

	public editCloud(cloud: VoxelCloud) {
		this.cloudEditor.setCloud(cloud);
	}

	public setImageSource(imageSource: ImageSource) {
		this.imageSource = imageSource;
		this.emit('sourceChange')
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
		this.annotations.concat(annotation);
	}

	public getAnnotations(): Annotation[] {
		// TODO: change to Iterator<Annotation>
		return this.annotations;
	}

	public renderAll() {
		if (!this.imageSource) throw 'ImageSource is not set';
		return this.imageSource.ready().then(() => {
			let p = [];
			this.viewers.forEach((v) => {
				p.push(v.render());
			});
			return Promise.all(p);
		});
	}

	public setTool(toolName: string): Tool {

		if (this.currentToolName === toolName) {
			return this.tools[toolName];
		}

		if (typeof this.tools[toolName] === 'undefined')
			throw 'Unknown tool: ' + toolName;

		let tool = this.tools[toolName];

		// bind viewers
		this.viewers.forEach((v) => {
			v.backgroundEventTarget = this.tools[toolName];
		});

		let before = this.currentToolName;
		this.currentToolName = toolName;
		this.emit('toolchange', before, toolName);

		return this.tools[toolName];
	}

	public getTool(toolName: string): Tool {
		if (typeof this.tools[toolName] === 'undefined')
			throw 'Unknown tool: ' + toolName;

		return this.tools[toolName];
	}

}
