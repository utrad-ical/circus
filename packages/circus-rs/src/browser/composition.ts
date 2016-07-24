'use strict';

import { EventEmitter } from 'events';

import { VoxelCloud } from '../common/VoxelCloud';

import { Painter } from '../browser/interface/painter';
import { Sprite } from '../browser/viewer/sprite';
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
	private painters: Painter[] = [];
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
		this.painters.push(cloudsRenderer);

	}

	public editCloud(cloud: VoxelCloud) {
		this.cloudEditor.setCloud(cloud);
	}

	public setImageSource(imageSource: ImageSource) {
		this.imageSource = imageSource;
		this.emit('sourceChange')
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
