'use strict';

import { EventEmitter } from 'events';
import { ViewerEvent } from '../viewer-event';
import { Sprite } from '../sprite';
import { VoxelCloudAnnotation } from './voxel-cloud';

// Note: Use any because generic can't have method.

export class VoxelCloudSprite extends Sprite {

	private parent: any;
	private emitter: EventEmitter;
	private isDragging: boolean;
	private previousVoxel: [number, number, number];

	constructor(parent: VoxelCloudAnnotation){
		this.parent = parent;
		super();
		this.isDragging = false;
		this.previousVoxel = [0, 0, 0];
		this.on('mouseup', this.mouseupHandler);
		this.on('mousedown', this.mousedownHandler);
		this.on('mousemove', this.mousemoveHandler);
	}
	public hitTest( event:ViewerEvent ):boolean {
		return true;//always true
	}
	private mouseupHandler(viewerEvent: ViewerEvent): void {
		this.isDragging = false;
	}
	private mousedownHandler(viewerEvent: ViewerEvent): void {
		this.isDragging = true;
		let vs = viewerEvent.viewer.getViewState();
		//save start voxel
		this.previousVoxel = vs.coordinatePixelToVoxel(viewerEvent.canvasX, viewerEvent.canvasY);
		//set current voxel
		this.parent.addVoxel(this.previousVoxel);
	}
	private mousemoveHandler(viewerEvent: ViewerEvent): void {
		if(this.isDragging) {
			let vs = viewerEvent.viewer.getViewState();
			//get current voxel coordinate
			let currentVoxel = vs.coordinatePixelToVoxel(viewerEvent.canvasX, viewerEvent.canvasY);
			//specify longest diff : can be minus value
			let diffX = currentVoxel[0] - this.previousVoxel[0];
			let diffY = currentVoxel[1] - this.previousVoxel[1];
			let diffZ = currentVoxel[2] - this.previousVoxel[2];
			let longestDiff = Math.max(Math.abs(diffX), Math.abs(diffY), Math.abs(diffZ));
			// calc micro step : can be minus value
			let microStepX = diffX / longestDiff;
			let microStepY = diffY / longestDiff;
			let microStepZ = diffZ / longestDiff;
			let currentCoordinate = [currentVoxel[0], currentVoxel[1], currentVoxel[2]];
			for (var i = 0; i < longestDiff; ++i) {
				currentCoordinate[0] = this.previousVoxel[0] + microStepX * i;
				currentCoordinate[1] = this.previousVoxel[1] + microStepY * i;
				currentCoordinate[2] = this.previousVoxel[2] + microStepZ * i;
				this.parent.addVoxel(currentCoordinate);
			}
			this.previousVoxel = currentVoxel;//set to current voxel

			//re-draw
			this.parent.draw(viewerEvent.original.target, vs);
		}
	}
}
