'use strict';

import { Sprite } from '../sprite';
import { Annotation } from './annotation';
import { VolumeViewState } from '../volume-view-state';
import { ViewerEvent } from '../viewer-event';
import { PointText } from './draft-point-text';
import { PointSprite } from './draft-point-sprite';

enum Mode{Dot = 0, Circle = 1};
enum DragMode{Move = 0, Change = 1};

export class PointAnnotation extends Annotation {
	private mode: Mode;
	private dragMode: DragMode;
	private center: [number, number, number];//draft-voxel coordinate
	private radius: number = 3;// [px] default value
	private color: [number, number, number, number] = [255, 255, 255, 1];//default value
	private pointText: PointText;
	private isFirstDraw: boolean = true;
	public isDragging: boolean = false;
	private sizeChanging: boolean = false;
	private centerOffset: [number, number] = [0, 0];

	public getMode(): number{
		return this.mode;
	}
	// public get getCenter(){
	public getCenter(): [number, number, number]{
		return this.center;
	}
	public getRadius(): number{
		return this.radius;
	}
	public getText(): PointText{
		return this.pointText;
	}
	public getSizeChanging(): boolean{
		return this.sizeChanging;
	}
	public getDragMode(): number{
		return this.dragMode;
	}

	public setMode(mode: Mode): void{
		this.mode = mode;
	}
	public setRadius(radius: number): void{
		if(radius >= 1) {
			this.radius = radius;
		}
	}
	public setCenter(center: number[]): void{
		this.center = [
			Math.round(center[0]),
			Math.round(center[1]),
			Math.round(center[2])
		];
	}
	public setSizeChanging(mode: boolean): void{
		this.sizeChanging = mode;
	}
	public setDragMode(mode: DragMode){
		this.dragMode = mode;
	}
	public setCenterOffset(viewerEvent: ViewerEvent): void{
		let vs = viewerEvent.viewer.getVolumeViewState();
		let currentCenterPixel: number[] = vs.coordinateVoxelToPixel(
			this.center[0],
			this.center[1],
			this.center[2]);
		this.centerOffset = [
			Math.round(viewerEvent.canvasX - currentCenterPixel[0]),
			Math.round(viewerEvent.canvasY - currentCenterPixel[1])
		];
	}

	constructor(
		mode: Mode,
		coord: [number, number, number],
		radius: number,
		color: [number, number, number, number],
		text: PointText) {
		super();
		this.mode = mode;
		this.center = coord;
		if(mode === Mode.Circle && radius > 0) {
			this.radius = radius;//no check?
		}
		this.color = color;//no check?
		for (var i = 0; i < 3; ++i) {//RGB
			if(color[i] >= 0 && color[i] <= 255) {
				this.color[i] = color[i];
			} else {
				this.color[i] = 255;
			}
		}
		if(color[3] >= 0 && color[3] <= 1) {//alpha
			this.color[3] = color[3];
		} else{
			this.color[3] = 1;
		}
		this.pointText = text;
	}
	public draw(canvasDomElement:HTMLCanvasElement, viewState:VolumeViewState): Sprite{
		let pointCenterCoordinate = viewState.coordinateVoxelToPixel(this.center[0], this.center[1], this.center[2]);
		if(Math.abs(pointCenterCoordinate[2]) > 5) {//don't display annotation if center is far from view surface
			return null;
		}
		let ctx = canvasDomElement.getContext('2d');
		ctx.beginPath();
		//calc radius with zoom
		let radius = this.radius;
		let zoom = viewState.getZoom();//use with circle and text
		if(this.mode === Mode.Circle) {//circle
			radius *= zoom;
		}
		ctx.arc(pointCenterCoordinate[0], pointCenterCoordinate[1], radius, 0, 2 * Math.PI);
		ctx.closePath();
		let colorString = this.color.join(",");
		colorString = "rgba(" + colorString + ")";
		switch (this.mode) {
			case Mode.Dot:
				ctx.fillStyle = colorString;
				ctx.fill();
				break;
			case Mode.Circle:
				ctx.strokeStyle = colorString;
				ctx.stroke();
				break;
		}
		// draw string
		this.pointText.draw(ctx, {"x":pointCenterCoordinate[0], "y":pointCenterCoordinate[1]}, zoom);
		return new PointSprite(this);
	}
	public dragPoint(viewerEvent: ViewerEvent): void{
		let v = viewerEvent.viewer;
		let currentVoxel = v.getVolumeViewState().coordinatePixelToVoxel(
			viewerEvent.canvasX - this.centerOffset[0],
			viewerEvent.canvasY - this.centerOffset[1]);
		this.setCenter(currentVoxel);
	}
}
