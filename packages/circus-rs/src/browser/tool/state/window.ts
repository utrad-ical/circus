'use strict';

import { DraggableTool } from '../../../browser/tool/draggable';
import { Viewer } from '../../../browser/viewer/viewer';
import { ViewState } from '../../view-state';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';

export class WindowTool extends DraggableTool implements ViewerEventTarget {

	public dragStartHandler(ev: ViewerEvent) {
		ev.viewer.primaryEventTarget = this;
		ev.stopPropagation();
	}

	public dragMoveHandler(ev: ViewerEvent, dragInfo) {
		const viewState = ev.viewer.getState();
		this.windowLevelBy(viewState, dragInfo.dx * ( ev.original.ctrlKey ? 2 : 1 ));
		this.windowWidthBy(viewState, dragInfo.dy * ( ev.original.ctrlKey ? 20 : 5 ));
		ev.viewer.setState(viewState);
		ev.stopPropagation();
	}

	public dragEndHandler(ev: ViewerEvent, dragInfo) {
		ev.viewer.primaryEventTarget = null;
		ev.stopPropagation();
	}

	/**
	 * window level / width
	 */
	public windowLevelBy(state: ViewState, dl: number) {
		state.window.level += dl;
	}

	public windowWidthBy(state: ViewState, dw: number) {
		state.window.width += dw;
		if (state.window.width < 1) state.window.width = 1;
	}
}
