'use strict';

import { EventEmitter } from 'events';
import { ViewerEvent } from '../viewer-event';
import { Sprite } from '../sprite';
import { PointAnnotation } from './point-annotation';

enum Kind{Dot = 0, Circle = 1};

export class PointSprite extends Sprite {
	private parent: PointAnnotation;
	private overSize: number = 10;
	// private hasDrawnHitTestCircle = false;
	// private hitRect: [number,number,number,number];

	constructor(parent: PointAnnotation) {
		super();
		this.parent = parent;
		this.on('mouseup', this.mouseupHandler);
		this.on('mousedown', this.mousedownHandler);
		this.on('mousemove', this.mousemoveHandler);
	}
	public hitTest( event:ViewerEvent ):boolean {
		// console.dir(event);
		let overSizeRadius = this.parent.getRadius();
		overSizeRadius += this.overSize;//set margin if point is dot
		let ctx = event.original.target.getContext('2d');
		ctx.beginPath();
		ctx.strokeStyle = "rgba(0,0,0,0)";
		let centerCircle = event.viewer.getViewState().coordinateVoxelToPixel(
			this.parent.getCenter()[0],
			this.parent.getCenter()[1],
			this.parent.getCenter()[2]);
		ctx.arc(centerCircle[0], centerCircle[1], overSizeRadius, 0, 2 * Math.PI);
		ctx.closePath();
		ctx.stroke();
		if(this.parent.getMode() === 0) {//dot
			let isNearPoint = ctx.isPointInPath(event.canvasX, event.canvasY);
			this.parent.setDragMode(0);//move
			return isNearPoint;
		} else {//circle
			let isAroundCircle = false;
			let isNearCenter = false;
			if(this.parent.getDragging()) {//dragging no check
				if(this.parent.getDragMode() === 0) {//moving
					isNearCenter = true;
				} else {//changing
					isAroundCircle = true;
				}
			} else {//NOT dragging
				isAroundCircle = ctx.isPointInPath(event.canvasX, event.canvasY);//order is important;
				isNearCenter = this.isNearCenter(ctx, centerCircle, [event.canvasX, event.canvasY]);//calc later
			}

			if(isNearCenter) {
				this.parent.setDragMode(0);//move
				return true;
			} else {
				if(isAroundCircle) {
					this.parent.setDragMode(1);//change
					return true;
				} else {
					return false;
				}
			}
		}
	}
	private mouseupHandler(viewerEvent: ViewerEvent): void {
		this.parent.setDragging(false);
		let textObj = this.parent.getText();
		textObj.recoverColor();
		let radius = this.parent.getRadius();
		if(radius <= 3) {
			this.parent.setRadius(3);//fixed value
			this.parent.setMode(0);//dot
		}
		viewerEvent.viewer.render();
	}
	private mousedownHandler(viewerEvent: ViewerEvent): void {
		this.parent.setDragging(true);
		let textObj = this.parent.getText();
		textObj.changeAttractColor();
		viewerEvent.viewer.render();
	}
	private mousemoveHandler(viewerEvent: ViewerEvent): void {
		if(!this.parent.getDragging()) {
			return;
		}
		let v = viewerEvent.viewer;
		if(this.parent.getDragMode() === 0) {//drag
			let currentVoxel = v.getViewState().coordinatePixelToVoxel(
				viewerEvent.canvasX,
				viewerEvent.canvasY);
			this.parent.setCenter(currentVoxel);
			v.render();
		} else{//change circle
			//calc radius
			let centerVoxel = this.parent.getCenter();
			let centerPixel = v.getViewState().coordinateVoxelToPixel(centerVoxel[0], centerVoxel[1], centerVoxel[2]);
			let diffX = Math.abs(centerPixel[0] - viewerEvent.canvasX);
			let diffY = Math.abs(centerPixel[1] - viewerEvent.canvasY);
			let radius2 = diffX * diffX + diffY * diffY;
			let radius = Math.sqrt(radius2);
			//set radius
			this.parent.setRadius(radius);
			v.render();
		}
	}
	private isNearCenter(ctx, centerCircle: [number, number], point: [number, number]): boolean{
		let innerBorder = this.parent.getRadius() - 2;
		ctx.beginPath();
		ctx.strokeStyle = "rgba(0,0,0,0)";
		ctx.arc(centerCircle[0], centerCircle[1], innerBorder, 0, 2 * Math.PI);
		ctx.closePath();
		ctx.stroke();
		return ctx.isPointInPath(point[0], point[1]);
	}
}