'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool }							from '../../../browser/tool/tool';
import { Viewer }						from '../../../browser/viewer/viewer';
import { ViewerEvent }					from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../../browser/interface/viewer-event-target';

export class HandTool extends Tool implements ViewerEventTarget {
	
	private ox: number;
	private oy: number;
	private drag: boolean;
	private defaultState;

	constructor(){
		super();
		this.drag = false;
	}
	
	public mousedownHandler(ev: ViewerEvent) {
		if( ! this.drag ){
			this.drag = true;
			this.defaultState = ev.viewer.getState();
			this.ox = ev.viewerX;
			this.oy = ev.viewerY;
			ev.viewer.primaryEventTarget = this;
		}
		ev.stopPropagation();
	}
	public mousemoveHandler(ev: ViewerEvent) {
		if( this.drag ){
			ev.stopPropagation();
			let state = ev.viewer.getState();
			
			let dxComponent = state.section.xAxis.map( i => i / ev.viewerWidth * ( this.ox - ev.viewerX ) );
			let dyComponent = state.section.yAxis.map( i => i / ev.viewerHeight * ( this.oy - ev.viewerY ) );
			vec3.add( state.section.origin, state.section.origin, dxComponent );
			vec3.add( state.section.origin, state.section.origin, dyComponent );
			this.ox = ev.viewerX;
			this.oy = ev.viewerY;
			
			ev.viewer.setState( state );
			ev.viewer.render();
		}
	}
	public mouseupHandler(ev: ViewerEvent) {
		if( this.drag ){
			this.drag = false;
			ev.viewer.primaryEventTarget = null;

			if( ev.original.ctrlKey ){
				ev.viewer.setState( this.defaultState );
				ev.viewer.render();
			}
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
