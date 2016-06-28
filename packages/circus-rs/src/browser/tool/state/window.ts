'use strict';

var {quat, mat4, vec2, vec3} = require('gl-matrix');

import { Tool } from '../../../browser/tool/tool';
import { DraggableTool } from '../../../browser/tool/draggable';
import { Viewer } from '../../../browser/viewer/viewer';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';

export class WindowTool extends DraggableTool implements ViewerEventTarget {

	constructor() {
		super();
	}

	public dragstartHandler(ev: ViewerEvent) {
		ev.viewer.primaryEventTarget = this;
		ev.stopPropagation();
	}

	public dragmoveHandler(ev: ViewerEvent, dragInfo) {
		this.windowLevelBy(ev.viewer, dragInfo.dx * ( ev.original.ctrlKey ? 2 : 1 ));
		this.windowWidthBy(ev.viewer, dragInfo.dy * ( ev.original.ctrlKey ? 20 : 5 ));
		ev.viewer.render();
		ev.stopPropagation();
	}

	public dragendHandler(ev: ViewerEvent, dragInfo) {
		ev.viewer.primaryEventTarget = null;
		ev.stopPropagation();
	}

	/**
	 * window level / width
	 */

	public windowLevelBy(viewer, dl: number) {
		let state = viewer.getState();
		state.window.level += dl;
		viewer.setState(state);
	}

	public windowWidthBy(viewer, dw: number) {
		let state = viewer.getState();
		state.window.width += dw;
		viewer.setState(state);
	}
}
