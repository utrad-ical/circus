'use strict';

import { DraggableTool } from '../draggable';
import { Viewer } from '../../viewer/viewer';
import { ViewerEvent } from '../../viewer/viewer-event';
import { ViewerEventTarget } from '../../interface/viewer-event-target';
import { ViewState, translateSection } from '../../view-state';

/**
 * HandTool is a tool which responds to a mouse drag and moves the
 * VolumeImageSource parallelly to the screen.
 */
export class HandTool extends DraggableTool implements ViewerEventTarget {

	public dragStartHandler(ev: ViewerEvent) {
		ev.viewer.primaryEventTarget = this;
		ev.stopPropagation();
	}

	public dragMoveHandler(ev: ViewerEvent, dragInfo) {
		const viewer = ev.viewer;
		const state = viewer.getState();
		const vp = viewer.getResolution();
		const newState: ViewState = this.translateBy(state, [dragInfo.dx, dragInfo.dy], vp);
		viewer.setState(newState);
		ev.stopPropagation();
	}

	public dragEndHandler(ev: ViewerEvent, dragInfo) {
		ev.viewer.primaryEventTarget = null;
		ev.stopPropagation();
	}

	public translateBy(state: ViewState, p: [number, number], vp: [number, number]): ViewState {
		const section = state.section;
		const eu = [
			section.xAxis[0] / vp[0],
			section.xAxis[1] / vp[0],
			section.xAxis[2] / vp[0]];
		const ev = [
			section.yAxis[0] / vp[1],
			section.yAxis[1] / vp[1],
			section.yAxis[2] / vp[1]];

		const [ dx2, dy2 ] = p;
		const [ dx, dy, dz ] = [
			eu[0] * -dx2 + ev[0] * -dy2,
			eu[1] * -dx2 + ev[1] * -dy2,
			eu[2] * -dx2 + ev[2] * -dy2];

		state.section = translateSection(state.section, [dx, dy, dz]);
		return state;
	}

}
