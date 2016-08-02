'use strict';

import { mat4, vec3 } from 'gl-matrix';
import { DraggableTool } from '../../../browser/tool/draggable';
import { Viewer } from '../../../browser/viewer/viewer';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';

export class HandTool extends DraggableTool implements ViewerEventTarget {

	constructor() {
		super();
	}

	public dragStartHandler(ev: ViewerEvent) {
		ev.viewer.primaryEventTarget = this;
		ev.stopPropagation();
	}

	public dragMoveHandler(ev: ViewerEvent, dragInfo) {
		this.translateBy(ev.viewer, [dragInfo.dx, dragInfo.dy]);
		ev.viewer.render();
		ev.stopPropagation();
	}

	public dragEndHandler(ev: ViewerEvent, dragInfo) {
		ev.viewer.primaryEventTarget = null;
		ev.stopPropagation();
	}

	public translateBy(viewer, p: [ number, number ]) {

		let state = viewer.getState();
		let vp = viewer.getResolution();

		let eu = [
			state.section.xAxis[0] / vp[0],
			state.section.xAxis[1] / vp[0],
			state.section.xAxis[2] / vp[0]];
		let ev = [
			state.section.yAxis[0] / vp[1],
			state.section.yAxis[1] / vp[1],
			state.section.yAxis[2] / vp[1]];

		let [ dx2, dy2 ] = p;
		let [ dx, dy, dz ] = [
			eu[0] * -dx2 + ev[0] * -dy2,
			eu[1] * -dx2 + ev[1] * -dy2,
			eu[2] * -dx2 + ev[2] * -dy2];

		state.section.origin[0] += dx;
		state.section.origin[1] += dy;
		state.section.origin[2] += dz;

		viewer.setState(state);
	}

}
