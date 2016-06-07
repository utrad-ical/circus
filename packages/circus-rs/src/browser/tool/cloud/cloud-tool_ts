'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { EventEmitter } from 'events'

import { VoxelCloud }					from '../../../common/VoxelCloud';
import { Viewer }						from '../../../browser/viewer/viewer';
import { ViewerEvent }					from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../../browser/interface/viewer-event-target';
import { Tool }							from '../../../browser/tool/tool';
import { CloudsRenderer }				from '../../../browser/tool/cloud/clouds-renderer';
import { default as CloudEditor }		from '../../../browser/tool/cloud/cloud-editor-dynamic';

export class CloudTool extends Tool implements ViewerEventTarget {
	
	public clouds: VoxelCloud[]; // move to composition
	public renderer: CloudsRenderer;
	public editor: CloudEditor;
	
	public penWidth: number = 10.0;
	// public penDepth: number = 10.0;
	public color: string = 'rgba(255,0,0,0.7)';

	constructor(){
		super();
		
		this.clouds = [];
		
		this.renderer = new CloudsRenderer();
		this.renderer.clouds = this.clouds;
		
		this.editor = new CloudEditor();
		
	}
	
	public addEmptyCloud( dimension ){
		let cloud = new VoxelCloud();
		cloud.setDimension( dimension[0], dimension[1], dimension[2] );
		cloud.color = [ 0xff, 0, 0, 0xff ];
		this.clouds.push( cloud );
		return cloud;
	}
	
	public addCloud( cloud: VoxelCloud ){
		this.clouds.push( cloud );
		this.setCloud( cloud );
	}
	public setCloud( cloud ){
		this.editor.cloud = cloud;
		this.emit( 'cloudchange', this.editor.cloud, cloud );
	}
	
	/**
	 * implements ViewerEventTarget
	 */
	
	public mousedownHandler( ev: ViewerEvent ){
	
		if( ! ev.original.shiftKey && this.editor.cloud ){
			let state = ev.viewer.viewState;
			this.editor.prepare( state.section, [ ev.viewerWidth, ev.viewerHeight ] );

			if( this.editor.penDown( ev.viewerX, ev.viewerY ) ){
				ev.stopPropagation();
				ev.viewer.primaryEventTarget = this;
				this.emit( 'pendown', this ); // for history ? 
			}
		}
	}

	public mousemoveHandler( e: ViewerEvent ){
		if( this.editor.cloud && this.editor.penMove( e.viewerX, e.viewerY ) ){
			e.stopPropagation();
			e.viewer.render();
		}
	}
	
	public mouseupHandler( e: ViewerEvent ){
		if( this.editor.cloud && this.editor.penUp( e.viewerX, e.viewerY ) ){
			e.viewer.primaryEventTarget = null;
			e.viewer.render();
			this.emit( 'penup', this ); // for history ? 
			e.stopPropagation();
		}
	}
	
	public mousewheelHandler( ev: ViewerEvent ){
	}

	
}

