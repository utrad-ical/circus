'use strict';

import { mat4, vec3 } from 'gl-matrix';

import { DraggableTool } from '../../../browser/tool/draggable';
import { Viewer } from '../../../browser/viewer/viewer';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';

export class CelestialRotateTool extends DraggableTool implements ViewerEventTarget {

	public dragStartHandler(ev: ViewerEvent): void {
		ev.viewer.primaryEventTarget = this;
		ev.stopPropagation();
	}

	public dragMoveHandler(ev: ViewerEvent, dragInfo): void {

		if (Math.abs(dragInfo.dx) && Math.abs(dragInfo.dx) >= Math.abs(dragInfo.dy)) {
			let hdeg = ( dragInfo.dx < 0 ? -1 : 1  ) * ( ev.original.ctrlKey ? 2 : 1 );
			this.horizontalRotate(ev.viewer, hdeg);
			ev.viewer.render();
			ev.stopPropagation();
		}
	}

	public dragEndHandler(ev: ViewerEvent, dragInfo): void {
		ev.viewer.primaryEventTarget = null;
		ev.stopPropagation();
	}

	public mouseWheelHandler(ev: ViewerEvent): void {
		let vdeg = ( ev.original.deltaY < 0 ? -1 : 1  ) * ( ev.original.ctrlKey ? 2 : 1 );
		this.verticalRotate(ev.viewer, vdeg);
		ev.viewer.render();
		ev.stopPropagation();
	}

	/**
	 * celestial rotate
	 */
	private initCelestialState(viewer: Viewer): boolean {
		if (typeof viewer.viewState.celestial === 'undefined') {
			viewer.viewState.celestial = {
				horizontal: 0,
				vertical: 0,
				defaultAxisX: vec3.clone(viewer.viewState.section.xAxis),
				defaultAxisY: vec3.clone(viewer.viewState.section.yAxis)
			};
			return true;
		} else {
			return false;
		}
	}

	public horizontalRotate(viewer: Viewer, deg: number) {

		this.initCelestialState(viewer);

		let state = viewer.getState();
		let [ vw, vh ] = state.resolution;

		let radian = Math.PI / 180.0 * deg;

		let end0 = state.section.xAxis.concat();

		// rotate
		let transform = mat4.rotate(mat4.create(), mat4.create(), radian, state.section.yAxis);
		vec3.transformMat4(state.section.xAxis, state.section.xAxis, transform);

		let end1 = state.section.xAxis.concat();

		state.section.origin[0] -= ( end1[0] - end0[0] ) / 2;
		state.section.origin[1] -= ( end1[1] - end0[1] ) / 2;
		state.section.origin[2] -= ( end1[2] - end0[2] ) / 2;

		viewer.setState(state);
	}

	public verticalRotate(viewer: Viewer, deg: number) {

		this.initCelestialState(viewer);

		let state = viewer.getState();
		let [ vw, vh ] = state.resolution;

		let radian = Math.PI / 180.0 * deg;

		let end0 = state.section.yAxis.concat();

		// rotate
		let transform = mat4.rotate(mat4.create(), mat4.create(), radian, state.section.xAxis);
		vec3.transformMat4(state.section.yAxis, state.section.yAxis, transform);

		let end1 = state.section.yAxis.concat();

		state.section.origin[0] -= ( end1[0] - end0[0] ) / 2;
		state.section.origin[1] -= ( end1[1] - end0[1] ) / 2;
		state.section.origin[2] -= ( end1[2] - end0[2] ) / 2;

		viewer.setState(state);
	}
}
