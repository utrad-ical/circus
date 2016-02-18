"use strict";

import { ViewerEvent } from './viewer-event'
import { ViewerEventCapture } from './viewer-event-capture-interface'
import { ViewState } from './view-state'
import { Tool } from './tool'
import { VoxelCloudAnnotation } from './annotation/voxel-cloud'

export class BucketTool extends Tool {
	private hoge:string = "";
	private fillMap: number[][];
	private voxAno: VoxelCloudAnnotation;
	private checkBuffer: [number, number][];
	constructor(argument) {
		super();
	}
	public hitTest(event: ViewerEvent): boolean{
		return true;
	}
	public mousedownHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		console.log("b down");
		//do nothing
		return false;
	}
	public mouseupHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		console.log("b up");
		//paint algorithm
		let v = viewerEvent.viewer;
		let currentAnnotation = v.getAnnotationCollection().getCurrentAnnotation();
		if(currentAnnotation === null) {
			return true;
		}
		if(!(currentAnnotation instanceof VoxelCloudAnnotation)) {
			return true;
		}

		//------------------
		let vs: ViewState = v.getViewState();
		let currentVoxel: [number, number, number] = vs.coordinatePixelToVoxel(
			viewerEvent.canvasX,
			viewerEvent.canvasY);
		//paint if currentAnnotation is instance of VoxelCloudAnnotation
		this.voxAno = <VoxelCloudAnnotation>currentAnnotation;//cast
		//check if current pixel is already painted
		if(this.voxAno.isPaintedVoxel(currentVoxel)) {
			return false;
		}
		let currentInspectCoordinate: [number, number] = [viewerEvent.canvasX, viewerEvent.canvasY];
		let canvas = {"x":vs.getSize()[0], "y":vs.getSize()[1]};//canvas size
		//init fill map and check buffer
		this.fillMap = new Array(canvas.x);
		for (var i = 0; i < this.fillMap.length; ++i) {
			this.fillMap[i] = new Array(canvas.y);
		}

		console.log("fill");
		//init buffer
		this.checkBuffer = [];
		this.checkBuffer[this.checkBuffer.length] = [currentInspectCoordinate[0], currentInspectCoordinate[1]];
		while(this.checkBuffer.length > 0){
			let currentPixel = this.checkBuffer.shift();
			//fill current pixel
			this.fillMap[currentInspectCoordinate[0]][currentInspectCoordinate[1]] = 1;
			this.voxAno.addVoxel(currentVoxel);
			//search current line
			let leftEdgeX =  this.checkLeft(currentInspectCoordinate[0] - 1, currentInspectCoordinate[1], vs, canvas);
			let rightEdgeX = this.checkRight(currentInspectCoordinate[0] + 1, currentInspectCoordinate[1], vs, canvas);
			//check upper and lower
			// this.checkUpperLower(
			// 	[leftEdgeX, currentInspectCoordinate[1] - 1],//left edge
			// 	[rightEdgeX, currentInspectCoordinate[1] - 1],
			// 	vs);
			// this.checkUpperLower(
			// 	[leftEdgeX, currentInspectCoordinate[1] + 1],//right edge
			// 	[rightEdgeX, currentInspectCoordinate[1] + 1],
			// 	vs);
		}
		// //fill current pixel
		// this.fillMap[currentInspectCoordinate[0]][currentInspectCoordinate[1]] = 1;
		// this.voxAno.addVoxel(currentVoxel);
		// //search current line
		// let leftEdgeX =  this.checkLeft(currentInspectCoordinate[0] - 1, currentInspectCoordinate[1], vs, canvas);
		// let rightEdgeX = this.checkRight(currentInspectCoordinate[0] + 1, currentInspectCoordinate[1], vs, canvas);
		// //check upper and lower
		// this.checkUpperLower(
		// 	[leftEdgeX, currentInspectCoordinate[1] - 1],//left edge
		// 	[rightEdgeX, currentInspectCoordinate[1] - 1],
		// 	vs);
		// this.checkUpperLower(
		// 	[leftEdgeX, currentInspectCoordinate[1] + 1],//right edge
		// 	[rightEdgeX, currentInspectCoordinate[1] + 1],
		// 	vs);

		v.render();
		return false;
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		console.log("b drag");
		//do nothing
		return false;
	}
	private checkLeft(tempX: number, tempY: number, vs: ViewState, canvas): number{
		//inspect first line : LEFT
		while(tempX >= 0){
			let voxel: [number, number, number] = vs.coordinatePixelToVoxel(
				tempX,
				tempY);
			if(this.voxAno.isPaintedVoxel(voxel)) {
				break;
			}
			this.voxAno.addVoxel(voxel);
			this.fillMap[tempX][tempY] = 1;
			tempX--;
		}
		return tempX;
	}
	private checkRight(tempX: number, tempY: number, vs: ViewState, canvas): number{
		//inspect first line : RIGHT
		while(tempX < canvas.x){
			let voxel: [number, number, number] = vs.coordinatePixelToVoxel(
				tempX,
				tempY);
			if(this.voxAno.isPaintedVoxel(voxel)) {
				break;
			}
			this.voxAno.addVoxel(voxel);
			this.fillMap[tempX][tempY] = 1;
			tempX++;
		}
		return tempX;
	}
	private checkUpperLower(left: [number, number], right: [number, number], vs: ViewState): void{
		let tempX = left[0];
		let tempY = left[1];
		let emptyPixels: number[][] = [];
		emptyPixels[0] = [];
		while(tempX <= right[0]){//check left to right
			let voxel: [number, number, number] = vs.coordinatePixelToVoxel(
				tempX,
				tempY);
			if(this.voxAno.isPaintedVoxel(voxel)) {//already painted
				emptyPixels[emptyPixels.length] = [];//append array
			} else {//not painted
				let len = emptyPixels[emptyPixels.length - 1].length;
				emptyPixels[emptyPixels.length - 1][len] = tempX;
			}
			//don't paint yet
			tempX++;
		}
		for (var i = 0; i < emptyPixels.length; ++i) {
			let max = Math.max.apply(null, emptyPixels[i]);
			this.checkBuffer[this.checkBuffer.length] = [max, tempY];
		}
	}
}