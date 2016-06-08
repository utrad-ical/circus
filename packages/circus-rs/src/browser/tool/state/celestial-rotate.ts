'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool }							from '../../../browser/tool/tool';
import { DraggableTool }				from '../../../browser/tool/draggable';
import { Viewer }						from '../../../browser/viewer/viewer';
import { ViewerEvent }					from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../../browser/interface/viewer-event-target';
import { CrossSection }					from '../../../browser/interface/cross-section';
import { CrossSectionUtil }				from '../../../browser/util/cross-section-util';

export class CelestialRotateTool extends DraggableTool implements ViewerEventTarget {
	
	constructor(){
		super();
	}
	
	public dragstartHandler( ev: ViewerEvent ){
		ev.viewer.primaryEventTarget = this;
		ev.stopPropagation();
	}
	
	public dragmoveHandler( ev: ViewerEvent, dragInfo ){
		
		if( Math.abs( dragInfo.dx ) && Math.abs( dragInfo.dx ) >= Math.abs( dragInfo.dy ) ){
			let hdeg = ( dragInfo.dx < 0 ? -1 : 1  ) * ( ev.original.ctrlKey ? 2 : 1 );
			this.horizontalRotate( ev.viewer, hdeg );
			ev.viewer.render();
			ev.stopPropagation();
		}
	}
	
	public dragendHandler( ev: ViewerEvent, dragInfo ) {
		ev.viewer.primaryEventTarget = null;
		if( ev.original.shiftKey ){
			this.resetCelestialState(ev.viewer);
			ev.viewer.render();
		}
		ev.stopPropagation();
	}
	
	public mousewheelHandler(ev: ViewerEvent) {
		let vdeg = ( ev.original.deltaY < 0 ? -1 : 1  ) * ( ev.original.ctrlKey ? 2 : 1 );
		this.verticalRotate( ev.viewer, vdeg );
		ev.viewer.render();
		ev.stopPropagation();
	}
	
	/**
	 * celestial rotate
	 */
	
	private initCelestialState( viewer: Viewer ): boolean {
		if( typeof viewer.viewState.celestial === 'undefined' ){
			viewer.viewState.celestial = {
				horizontal: 0,
				vertical: 0,
				defaultAxisX: vec3.clone( viewer.viewState.section.xAxis ),
				defaultAxisY: vec3.clone( viewer.viewState.section.yAxis )
			};
			return true;
		}else{
			return false;
		}
	}
	
	public horizontalRotate( viewer: Viewer, deg: number ){

		this.initCelestialState( viewer );
	
		let state = viewer.getState();
		let [ vw, vh ] = viewer.getResolution();

		let center = this.getVolumePos( state.section, [ vw, vh ], vw / 2, vh / 2 );
		CrossSectionUtil.rotate( state.section, deg, viewer.viewState.section.yAxis, center );
		state.celestial.horizontal += deg;

		viewer.setState( state );
	}
	
	public verticalRotate( viewer: Viewer, deg: number ){

		this.initCelestialState( viewer );
	
		let state = viewer.getState();
		let [ vw, vh ] = viewer.getResolution();

		let center = this.getVolumePos( state.section, [ vw, vh ], vw / 2, vh / 2 );
		CrossSectionUtil.rotate( state.section, deg, viewer.viewState.section.xAxis, center );
		state.celestial.vertical += deg;

		viewer.setState( state );
	}
	
	public resetCelestialState( viewer: Viewer ){
		
		if( typeof viewer.viewState.celestial !== 'undefined' ){
			
			let state = viewer.getState();
			let c0 = CrossSectionUtil.center( state.section );
			vec3.scale( state.section.xAxis, state.celestial.defaultAxisX, vec3.length( state.section.xAxis ) / vec3.length( state.celestial.defaultAxisX ) );
			vec3.scale( state.section.yAxis, state.celestial.defaultAxisY, vec3.length( state.section.yAxis ) / vec3.length( state.celestial.defaultAxisY ) );
			let c1 = CrossSectionUtil.center( state.section );
			state.section.origin[0] -= c1[0] - c0[0];
			state.section.origin[1] -= c1[1] - c0[1];
			state.section.origin[2] -= c1[2] - c0[2];
			viewer.setState( state );
			
			delete viewer.viewState.celestial;
		}
	}
}
