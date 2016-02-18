'use strict';

// import { EventEmitter } from 'events';
import { ViewerEvent } from '../viewer-event';
import { Sprite } from '../sprite';
import { VoxelCloudAnnotation } from './voxel-cloud';

// Note: Use any because generic can't have method.

export class VoxelCloudSprite extends Sprite {

	// private emitter: EventEmitter;

	constructor(parent: VoxelCloudAnnotation){
		super();
	}
	public hitTest( event:ViewerEvent ):boolean {
		return true;//always true
	}
	public mouseupHandler(viewerEvent: ViewerEvent): boolean {
		return true;
	}
	public mousedownHandler(viewerEvent: ViewerEvent): boolean {
		return true;
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): boolean {
		return true;
	}
}
