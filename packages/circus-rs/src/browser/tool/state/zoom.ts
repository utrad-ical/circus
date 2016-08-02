'use strict';

import { mat4, vec3 } from 'gl-matrix';
import { DraggableTool } from '../../../browser/tool/draggable';
import { Viewer } from '../../../browser/viewer/viewer';
import { ViewState } from '../../view-state';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';

export class ZoomTool extends DraggableTool implements ViewerEventTarget {

	public dragStartHandler(ev: ViewerEvent) {
		ev.viewer.primaryEventTarget = this;
		ev.stopPropagation();
	}

	public dragMoveHandler(ev: ViewerEvent, dragInfo) {
		const viewState = ev.viewer.getState();
		ev.viewer.setState(viewState);
		ev.stopPropagation();
	}

	public dragEndHandler(ev: ViewerEvent, dragInfo) {
		ev.viewer.primaryEventTarget = null;
		ev.stopPropagation();
	}

	public mouseWheelHandler(ev: ViewerEvent) {
		this.zoom(ev.viewer,
			ev.original.ctrlKey ? ( ev.original.deltaY > 0 ? '+3' : '-3' ) : ( ev.original.deltaY > 0 ? '+1' : '-1' ),
			[ev.viewerX, ev.viewerY]);
		// ev.viewer.render();
		ev.stopPropagation();
	}

	/**
	 * pan / zoom ( with translate )
	 */
	private initZoomState(viewer: Viewer): void {
		const viewState = viewer.getState();
		if (typeof viewState.zoom === 'undefined') {
			viewState.zoom = {
				value: 1,
				x: 0,
				y: 0,
				z: 0
			};
			viewer.setState(viewState);
		}
	}

	private zoom(viewer: Viewer, zoomVal: number|string, fp?: [number,number]) {

		const zoomRate = 1.05;

		this.initZoomState(viewer);

		const state: ViewState = viewer.getState();

		if (typeof zoomVal === 'string') {
			if (( zoomVal as string ).substr(0, 1) === '+') {
				zoomVal = state.zoom.value + Math.round(Number(( zoomVal as string ).substr(1)));
			} else if (( zoomVal as string ).substr(0, 1) === '-') {
				zoomVal = state.zoom.value - Math.round(Number(( zoomVal as string ).substr(1)));
			} else {
				zoomVal = state.zoom.value;
			}
		} else if (typeof zoomVal === 'number') {
			zoomVal = Math.round(( zoomVal as number ));
		} else {
			zoomVal = state.zoom.value;
		}

		if (zoomVal != state.zoom.value) {
			let vp = viewer.getResolution();
			if (!fp) fp = [vp[0] / 2, vp[1] / 2];

			let [ x0, y0, z0 ] = state.section.origin;

			let focus = this.getVolumePos(state.section, vp, fp[0], fp[1]);
			this.scale(
				state.section,
				Math.pow(zoomRate, zoomVal as number) / Math.pow(zoomRate, state.zoom.value),
				focus);

			state.zoom.value = zoomVal;

			let [ x1, y1, z1 ] = state.section.origin;
			state.zoom.x += x1 - x0;
			state.zoom.y += y1 - y0;
			state.zoom.z += z1 - z0;

			viewer.setState(state);
		}
	}

	private scale(section, scale: number, centralPoint) {

		let operation = [
			t => mat4.translate(t, t, vec3.scale(vec3.create(), centralPoint, -1)),
			t => mat4.scale(t, t, vec3.fromValues(scale, scale, scale)),
			t => mat4.translate(t, t, centralPoint)
		].reverse().reduce((p, t) => t(p), mat4.create());

		let xEndPoint = vec3.add(vec3.create(), section.origin, section.xAxis);
		let yEndPoint = vec3.add(vec3.create(), section.origin, section.yAxis);
		let [ o, x, y ] = [section.origin, xEndPoint, yEndPoint].map(
			p => vec3.transformMat4(vec3.create(), p, operation)
		);
		let xAxis = vec3.subtract(vec3.create(), x, o);
		let yAxis = vec3.subtract(vec3.create(), y, o);

		vec3.copy(section.origin, o);
		vec3.copy(section.xAxis, xAxis);
		vec3.copy(section.yAxis, yAxis);
	}

	private resetZoomState(viewer: Viewer) {
		const viewState = viewer.getState();
		if (typeof viewState.zoom !== 'undefined') {

			this.zoom(viewer, 0);

			let state = viewer.getState();
			state.section.origin[0] -= state.zoom.x;
			state.section.origin[1] -= state.zoom.y;
			state.section.origin[2] -= state.zoom.z;

			delete state.zoom;
			viewer.setState(state);
		}
	}
}
