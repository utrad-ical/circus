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

	private active: boolean;
	private pendown: boolean;
	private voxelBuffer;
	private annotationCollection;

	constructor( annotationCollection ) {
		super();
		this.on('focus', this.focusHandler);
		this.on('blur', this.blurHandler);
		this.on('mousedown', this.mousedownHandler);
		this.on('mousemove', this.mousemoveHandler);
		this.on('mouseup', this.mouseupHandler);
	}

	public hitTest(){
		return this.active;
	}

	private getViewerFromEvent( event ){
		var viewer = [];

		var composition = event.viewer.getComposition();
		if( composition !== null ){
		viewer = composition.getViewer();
		}else{
		viewer = [ event.viewer ];
		}
		return viewer;
	}

	private focusHandler( event ){
		this.active = true;
		var composition = event.viewer.getComposition();
		if( composition !== null ){
		this.annotationCollection = composition.getAnnotationCollection();
		}else{
		this.annotationCollection = event.viewer.getAnnotationCollection();
		}
	}
	private blurHandler( event ){
		this.active = false;
	}
	public mousedownHandler( event ): boolean{
		this.pendown = true;
		var viewerCollection = this.getViewerFromEvent( event );
		viewerCollection.forEach( function( viewer ){
		viewer.setPrimaryCapture( this );
		} );
		return true;
	}
	public mousemoveHandler( event ): boolean{
		// add to this.voxel
		/*
		var annotation = new VoxelCloudAnnotation( this.voxelBuffer );
		var viewerCollection = this.getViewerFromEvent( event );
		viewerCollection.forEach( function( viewer ){
		viewer.draw( annotation.draw ); // not regist annotation
		} )
		*/
		return true;
	}
	public mouseupHandler( event ): boolean{
		this.pendown = false;
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
		return true;
	}
}
