'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool } from './tool'
import { Viewer } from '../viewer'
import { ViewerEvent } from '../viewer-event'
import { ViewerEventTarget } from '../viewer-event-target'
import { CrossSection } from '../cross-section'

export class RotateTool extends Tool implements ViewerEventTarget {
	
	private ox: number;
	private oy: number;
	private drag: boolean;
	private defaultState;
	private hAxis: [number,number,number];
	private hRotated: number;
	private vAxis: [number,number,number];
	private vRotated: number;

	constructor(){
		super();
		this.drag = false;
		
		this.on('focus', ( viewer )=>{
			viewer.backgroundEventTarget = this;
		});
	}

	public mousedownHandler(ev: ViewerEvent) {
		if( ! this.drag ){
			this.drag = true;
			this.defaultState = JSON.parse( JSON.stringify( ev.viewer.viewState ) ); // deep clone;
			this.vAxis = vec3.scale( vec3.create(), ev.viewer.viewState.section.xAxis, -1 );
			this.hAxis = ev.viewer.viewState.section.yAxis;
			this.hRotated = 0;
			this.vRotated = 0;
			this.ox = ev.original.offsetX;
			this.oy = ev.original.offsetY;
			ev.viewer.primaryEventTarget = this;
		}
		
		ev.stopPropagation();
	}
	public mousemoveHandler(ev: ViewerEvent) {
		if( this.drag ){
			let canvasWidth = ev.original.target.getAttribute('width');
			let canvasHeight = ev.original.target.getAttribute('height');
			
			let viewState = ev.viewer.viewState;
			let hRotate = canvasWidth / 360 * ( this.ox - ev.original.offsetX );
			let vRotate = canvasHeight / 360 * ( this.oy - ev.original.offsetY );
			
			CrossSection.rotate( viewState.section, hRotate - this.hRotated, this.hAxis );
			this.hRotated = hRotate;
			CrossSection.rotate( viewState.section, vRotate - this.vRotated, this.vAxis );
			this.vRotated = vRotate;
			
			ev.viewer.render();
			ev.stopPropagation();
		}
	}
	public mouseupHandler(ev: ViewerEvent) {
		if( this.drag ){
			this.drag = false;
			ev.viewer.primaryEventTarget = null;
			if( ev.original.ctrlKey ) CrossSection.copy( ev.viewer.viewState.section, this.defaultState.section );
			ev.viewer.render();
		}
		ev.stopPropagation();
	}
	public mousewheelHandler(ev: ViewerEvent) {
		
		let viewState = ev.viewer.viewState;
		let nv = vec3.create();
			
		vec3.cross( nv, viewState.section.xAxis, viewState.section.yAxis );
		vec3.normalize( nv, nv );
		if( ev.original.deltaY > 0 ) vec3.scale( nv, nv, -1 );
		
		vec3.add( viewState.section.origin, viewState.section.origin, nv );
		ev.viewer.render();
		ev.stopPropagation();
	}
}
