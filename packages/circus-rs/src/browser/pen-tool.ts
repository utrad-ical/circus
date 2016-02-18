'use strict';

/**
 * NOTE:
 * stand alone を削除する
 **/

import { ViewerEvent } from './viewer-event'
import { ViewerEventCapture } from './viewer-event-capture-interface'
// import { VoxelContainer } from './common/voxelContainer'
import { Tool } from './tool'
import { VoxelCloudAnnotation } from './annotation/voxel-cloud'

export class PenTool extends Tool {

	private isDragging: boolean = false;
	private previousVoxel: [number, number, number];
	// private active: boolean;
	// private pendown: boolean;
	// private voxelBuffer;
	private currentVoxelCloud: VoxelCloudAnnotation;
	private annotationCollection;

	constructor( annotationCollection ) {
		super();
		this.previousVoxel = [0, 0, 0];
		// this.on('focus', this.focusHandler);
		// this.on('blur', this.blurHandler);
		// this.on('mousedown', this.mousedownHandler);
		// this.on('mousemove', this.mousemoveHandler);
		// this.on('mouseup', this.mouseupHandler);
	}

	public hitTest(event: ViewerEvent){
		return true;
	}

	private getViewerFromEvent( event: ViewerEvent ){
		var viewer = [];

		// var composition = event.viewer.getComposition();
		// if( composition !== null ){
		// 	viewer = composition.getViewer();
		// }else{
		// 	viewer = [ event.viewer ];
		// }
		return viewer;
	}

	private focusHandler( event: ViewerEvent ): boolean{
		if(!this.hitTest(event)) {
			return true;
		}
		// this.active = true;
		var composition = event.viewer.getComposition();
		if( composition !== null ){
			this.annotationCollection = composition.getAnnotationCollection();
		}else{
			this.annotationCollection = event.viewer.getAnnotationCollection();
		}
		return false;
	}
	private blurHandler( event: ViewerEvent ): boolean{
		if(!this.hitTest(event)) {
			return true;
		}
		// this.active = false;
		return false;
	}
	public mouseupHandler( event: ViewerEvent ): boolean{
		if(!this.hitTest(event)) {
			return true;
		}
		this.isDragging = false;
		// this.pendown = false;
		/*
		var annotation = new VoxelCloudAnnotation( this.voxelBuffer );
		this.annotationCollection.append( annotation );
		var viewerCollection = this.getViewerFromEvent( event );
		viewerCollection.forEach( function( viewer ){
		viewer.unsetPrimaryCapture();
		viewer.render();
		} )
		*/
		// clear this.voxelBuffer
		return false;
	}
	public mousedownHandler( viewerEvent: ViewerEvent ): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}

		let vs = viewerEvent.viewer.getViewState();
		// //save start voxel
		let currentVoxel = vs.coordinatePixelToVoxel(viewerEvent.canvasX, viewerEvent.canvasY);
		this.previousVoxel = [
			Math.round(currentVoxel[0]),
			Math.round(currentVoxel[1]),
			Math.round(currentVoxel[2])
		];
		// this.pendown = true;
		// var viewerCollection = this.getViewerFromEvent( viewerEvent );
		// 	viewerCollection.forEach( function( viewer ){
		// 	viewer.setPrimaryCapture( this );
		// });
		//----------------
		let viewer = viewerEvent.viewer;
		let voxAno = viewer.getAnnotationCollection().getAnnotationById(viewer.getCurrentAnnotationId());
		if(voxAno === null) {
			//do nothing
		} else {//voxAno is annotation
			if(voxAno instanceof VoxelCloudAnnotation) {
				this.isDragging = true;//start drawing!
			} else {
				voxAno = null;
			}
		}
		if(voxAno !== null) {
			let voxelCoordinate = vs.coordinatePixelToVoxel(viewerEvent.canvasX, viewerEvent.canvasY);
			this.currentVoxelCloud = <VoxelCloudAnnotation>voxAno;//save target voxelAnnotation
			this.currentVoxelCloud.addVoxel(voxelCoordinate);
			//re-draw
			this.currentVoxelCloud.draw(viewerEvent.original.target, vs);
			return false;
		} else {//do nothing...
			// let newVoxelCloud = new VoxelCloudAnnotation([512, 512, 128], [voxelCoordinate], [0, 255, 0, 1.0]);
			// let newId = anoCol.append(newVoxelCloud);
			// this.currentVoxelCloud = newVoxelCloud;//save target voxelAnnotation
			return true;
		}
	}
	public mousemoveHandler( viewerEvent: ViewerEvent ): boolean{
		if(!this.hitTest(viewerEvent)) {
			return true;
		}
		if(!this.isDragging) {
			return false;
		}
		// add to this.voxel
		/*
		var annotation = new VoxelCloudAnnotation( this.voxelBuffer );
		var viewerCollection = this.getViewerFromEvent( event );
		viewerCollection.forEach( function( viewer ){
		viewer.draw( annotation.draw ); // not regist annotation
		} )
		*/
		//=====================================
		let vs = viewerEvent.viewer.getViewState();
		//get current voxel coordinate
		let currentVoxel = vs.coordinatePixelToVoxel(viewerEvent.canvasX, viewerEvent.canvasY);
		currentVoxel = [//round to integer
			Math.round(currentVoxel[0]),
			Math.round(currentVoxel[1]),
			Math.round(currentVoxel[2])
		];
		//specify longest diff : can be minus value
		let diffX = currentVoxel[0] - this.previousVoxel[0];
		let diffY = currentVoxel[1] - this.previousVoxel[1];
		let diffZ = currentVoxel[2] - this.previousVoxel[2];
		let longestDiff = Math.max(Math.abs(diffX), Math.abs(diffY), Math.abs(diffZ));
		// calc micro step : can be minus value
		let microStepX = diffX / longestDiff;
		let microStepY = diffY / longestDiff;
		let microStepZ = diffZ / longestDiff;
		let currentCoordinate: [number, number, number] = [currentVoxel[0], currentVoxel[1], currentVoxel[2]];
		for (var i = 0; i < longestDiff; ++i) {
			currentCoordinate[0] = this.previousVoxel[0] + microStepX * i;
			currentCoordinate[1] = this.previousVoxel[1] + microStepY * i;
			currentCoordinate[2] = this.previousVoxel[2] + microStepZ * i;
			this.currentVoxelCloud.addVoxel(currentCoordinate);
		}
		this.previousVoxel = currentVoxel;//set to current voxel

		//re-draw
		this.currentVoxelCloud.draw(viewerEvent.original.target, vs);
		return false;
	}
}
