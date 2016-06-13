'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool }							from '../../../browser/tool/tool';
import { DraggableTool }				from '../../../browser/tool/draggable';
import { Viewer }						from '../../../browser/viewer/viewer';
import { ViewerEvent }					from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget }			from '../../../browser/interface/viewer-event-target';

export class HandTool extends DraggableTool implements ViewerEventTarget {
	
	constructor(){
		super();
	}
	
	public dragstartHandler( ev: ViewerEvent ){
		ev.viewer.primaryEventTarget = this;
		ev.stopPropagation();
	}
	
	public dragmoveHandler( ev: ViewerEvent, dragInfo ){
		this.translateBy( ev.viewer, [ dragInfo.dx, dragInfo.dy ] );
		ev.viewer.render();
		ev.stopPropagation();
	}
	
	public dragendHandler( ev: ViewerEvent, dragInfo ) {
		ev.viewer.primaryEventTarget = null;
		if( ev.original.shiftKey ){
			this.resetTranslateState(ev.viewer);
			this.resetZoomState(ev.viewer);
			ev.viewer.render();
		}
		ev.stopPropagation();
	}
	public mousewheelHandler(ev: ViewerEvent) {
		this.zoom( ev.viewer,
			ev.original.ctrlKey ? ( ev.original.deltaY > 0 ? '+3' : '-3' ) : ( ev.original.deltaY > 0 ? '+1' : '-1' ) ,
			[ ev.viewerX, ev.viewerY ]  );
		ev.viewer.render();
		ev.stopPropagation();
	}
	
	/**
	 * Translate viewport
	 */
	private initTranslateState( viewer: Viewer ): boolean {
		if( typeof viewer.viewState.translate === 'undefined' ){
			viewer.viewState.translate = { x: 0, y: 0, z: 0 };
			return true;
		}else{
			return false;
		}
	}
	
	public translateBy( viewer, p: [ number, number ] ) {
	
		this.initTranslateState( viewer );
	
		let state = viewer.getState();
		let vp = viewer.getResolution();
		let [ eu, ev ] = this.getUnit( state.section, vp );
		
		let [ dx2, dy2 ] = p;
		let [ dx, dy, dz ] = [
			Math.round( eu[0] * -dx2 + ev[0] * -dy2 ),
			Math.round( eu[1] * -dx2 + ev[1] * -dy2 ),
			Math.round( eu[2] * -dx2 + ev[2] * -dy2 ) ];
		
		state.translate.x += dx;
		state.translate.y += dy;
		state.translate.z += dz;
		
		state.section.origin[0] += dx;
		state.section.origin[1] += dy;
		state.section.origin[2] += dz;
		
		viewer.setState( state );
	}
	
	public resetTranslateState( viewer: Viewer ){
		
		if( typeof viewer.viewState.translate !== 'undefined' ){
		
			let state = viewer.getState();
			state.section.origin[0] -= state.translate.x;
			state.section.origin[1] -= state.translate.y;
			state.section.origin[2] -= state.translate.z;
			delete state.translate;
			
			viewer.setState( state );
		}
	}
	
	/**
	 * pan / zoom ( with translate )
	 */
	
	private initZoomState( viewer ){
		if( typeof viewer.viewState.zoom === 'undefined' ){
			viewer.viewState.zoom = {
				value: 1,
				x: 0,
				y: 0,
				z: 0
			};
			return true;
		}else{
			return false;
		}
	}
	
	public zoom( viewer, zoomVal: number|string, fp?: [number,number] ) {

		let zoomRate = 1.05;
	
		this.initZoomState( viewer );

		let state = viewer.getState();
		
		if( typeof zoomVal === 'string' ){
			if( ( zoomVal as string ).substr(0,1) === '+' ){
				zoomVal = state.zoom.value + Math.round( Number( ( zoomVal as string ).substr(1) ) );
			}else if( ( zoomVal as string ).substr(0,1) === '-' ){
				zoomVal = state.zoom.value - Math.round( Number( ( zoomVal as string ).substr(1) ) );
			}else{
				zoomVal = state.zoom.value;
			}
		}else if( typeof zoomVal === 'number' ){
			zoomVal = Math.round( ( zoomVal as number ) );
		}else{
			zoomVal = state.zoom.value;
		}
		
		if( zoomVal != state.zoom.value ){
			let vp = viewer.getResolution();
			if( !fp ) fp = [ vp[0] / 2, vp[1] / 2 ];
			
			let [ x0, y0, z0 ] = state.section.origin;
			
			let focus = this.getVolumePos( state.section, vp, fp[0], fp[1] );
			this.scale(
				state.section,
				Math.pow( zoomRate, zoomVal as number ) / Math.pow( zoomRate, state.zoom.value ),
				focus );
			
			state.zoom.value = zoomVal;
			
			let [ x1, y1, z1 ] = state.section.origin;
			state.zoom.x += x1 - x0;
			state.zoom.y += y1 - y0;
			state.zoom.z += z1 - z0;
			
			viewer.setState( state );
		}
	}
	private scale( section, scale: number, centralPoint ) {

		let operation = [
			t => mat4.translate( t, t, vec3.scale( vec3.create(), centralPoint, -1) ),
			t => mat4.scale( t, t, vec3.fromValues( scale, scale, scale ) ),
			t => mat4.translate( t, t, centralPoint )
		].reverse().reduce( (p, t) => t(p), mat4.create() );

		let xEndPoint = vec3.add(vec3.create(), section.origin, section.xAxis );
		let yEndPoint = vec3.add(vec3.create(), section.origin, section.yAxis );
		let [ o, x, y ] = [ section.origin, xEndPoint, yEndPoint ].map(
			p => vec3.transformMat4(vec3.create(), p, operation)
		);
		let xAxis = vec3.subtract(vec3.create(), x, o);
		let yAxis = vec3.subtract(vec3.create(), y, o);
		
		vec3.copy( section.origin, o );
		vec3.copy( section.xAxis, xAxis );
		vec3.copy( section.yAxis, yAxis );
	}
	
	public resetZoomState( viewer ){
		if( typeof viewer.viewState.zoom !== 'undefined' ){
		
			this.zoom( viewer, 0 );
		
			let state = viewer.getState();
			state.section.origin[0] -= state.zoom.x;
			state.section.origin[1] -= state.zoom.y;
			state.section.origin[2] -= state.zoom.z;

			delete state.zoom;
			viewer.setState( state );
		}
	}
}
