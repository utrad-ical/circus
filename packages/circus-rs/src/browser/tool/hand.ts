'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool } from './tool'
import { Viewer } from '../viewer'
import { ViewerEvent } from '../viewer-event'
import { ViewerEventTarget } from '../viewer-event-target'
import { CrossSection } from '../cross-section'

export class HandTool extends Tool implements ViewerEventTarget {
	
	private ox: number;
	private oy: number;
	private drag: boolean;
	private defaultState;

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
			let dxComponent = viewState.section.xAxis.map( i => i / canvasWidth * ( this.ox - ev.original.offsetX ) );
			let dyComponent = viewState.section.yAxis.map( i => i / canvasHeight * ( this.oy - ev.original.offsetY ) );
			vec3.add( viewState.section.origin, viewState.section.origin, dxComponent );
			vec3.add( viewState.section.origin, viewState.section.origin, dyComponent );
			ev.viewer.render();

			this.ox = ev.original.offsetX;
			this.oy = ev.original.offsetY;
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
