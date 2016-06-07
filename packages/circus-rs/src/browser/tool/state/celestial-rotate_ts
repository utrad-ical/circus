'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool }							from '../../../browser/tool/tool';
import { Viewer }						from '../../../browser/viewer/viewer';
import { ViewerEvent }					from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../../browser/interface/viewer-event-target';
import { CrossSection }					from '../../../browser/interface/cross-section';
import { CrossSectionUtil }				from '../../../browser/util/cross-section-util';

export class CelestialRotateTool extends Tool implements ViewerEventTarget {
	
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
			this.defaultState = ev.viewer.getState();
			this.vAxis = vec3.scale( vec3.create(), ev.viewer.viewState.section.xAxis, -1 );
			this.hAxis = ev.viewer.viewState.section.yAxis;
			this.hRotated = 0;
			this.vRotated = 0;
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

			let hRotate = ev.viewerWidth / 360 * ( this.ox - ev.viewerX );
			CrossSectionUtil.rotate( state.section, hRotate - this.hRotated, this.hAxis );
			this.hRotated = hRotate;

			// let vRotate = ev.viewerHeight / 360 * ( this.oy - ev.viewerY );
			// CrossSectionUtil.rotate( state.section, vRotate - this.vRotated, this.vAxis );
			// this.vRotated = vRotate;
			
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
}
