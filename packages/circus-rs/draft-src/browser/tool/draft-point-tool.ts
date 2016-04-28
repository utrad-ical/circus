"use strict";

import { ViewerEvent } from '../viewer-event'
import { ViewerEventCapture } from '../viewer-event-capture-interface'
import { Tool } from './draft-tool'
import { PointAnnotation } from '../annotation/draft-point-annotation';
import { PointText } from '../annotation/draft-point-text';


export class PointTool extends Tool {
	private pointAnnotation: PointAnnotation;
	private isDragging: boolean = false;
	private drawMode: number;//0:dot 1:circle
	constructor(opt, mode: number) {
		super(opt);
		this.drawMode = mode;
	}
	public hitTest(event: ViewerEvent): boolean{
		// let checkedToolElm: HTMLInputElement = <HTMLInputElement>document.querySelector("[name=tool]:checked");
		// // console.dir(checkedToolElm);
		// let isPoint: boolean = false;
		// if(checkedToolElm.value === "point") {
		// 	isPoint = true;
		// }
		// return isPoint;
		return true;
	}
	public mousedownHandler(viewerEvent: ViewerEvent): boolean {
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		this.isDragging = true;
		let vs = viewerEvent.viewer.getViewState();
		let currentVoxel = vs.coordinatePixelToVoxel(viewerEvent.canvasX, viewerEvent.canvasY);
		let text = (<HTMLInputElement>document.getElementById("circle_text")).value;
		if(text === "") {
			text = "default text";
		}
		let dotText = new PointText(text);
		let fontString = (<HTMLInputElement>document.getElementById("font_text")).value;
		dotText.setFont(fontString);
		let newAnnotation = new PointAnnotation(
			this.drawMode,//circle
			[Math.round(currentVoxel[0]), Math.round(currentVoxel[1]), Math.round(currentVoxel[2])],
			10,
			[255, 0, 0, 1],
			dotText);
		this.pointAnnotation = newAnnotation;//copy to use mousemove and mouseup

		viewerEvent.viewer.setPrimaryEventCapture( this );
		viewerEvent.viewer.drawBy( newAnnotation );

		return false;
	}
	public mouseupHandler(viewerEvent: ViewerEvent): boolean {
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		console.dir(viewerEvent);
		console.log("point-tool:mouseup");
		this.isDragging = false;
		viewerEvent.viewer.clearPrimaryEventCapture();
		let newId = viewerEvent.viewer.getAnnotationCollection().append(this.pointAnnotation);
		return false;
	}
	public mousemoveHandler(viewerEvent: ViewerEvent): boolean {
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		if(!this.isDragging) {
			return;
		}
		console.log("point-tool:dragging!");
		let vs = viewerEvent.viewer.getViewState();
		if(this.drawMode === 1) {//circle
			let voxelCenter = this.pointAnnotation.getCenter();
			let dotCenter = vs.coordinateVoxelToPixel(voxelCenter[0], voxelCenter[1], voxelCenter[2]);
			let currentMouseCoordinate = [viewerEvent.canvasX, viewerEvent.canvasY];
			//calc radius
			let diffX = Math.abs(viewerEvent.canvasX - dotCenter[0]);
			let diffY = Math.abs(viewerEvent.canvasY - dotCenter[1]);
			let radius2 = diffX * diffX + diffY * diffY;
			let radius = Math.sqrt(radius2);
			//set radius
			this.pointAnnotation.setRadius(radius);
			//update canvas
			viewerEvent.viewer.render().then(() => {
				viewerEvent.viewer.drawBy( this.pointAnnotation );
			});
		}else{//dot
			//get voxel coordinate
			let newVoxelCoordinate = vs.coordinatePixelToVoxel(viewerEvent.canvasX, viewerEvent.canvasY);
			//set new center coordinate
			this.pointAnnotation.setCenter(newVoxelCoordinate);
			//update canvas
			viewerEvent.viewer.render().then(() => {
				viewerEvent.viewer.drawBy( this.pointAnnotation );
			});
		}
		return false;
	}
}