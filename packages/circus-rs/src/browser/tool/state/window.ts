import { DraggableTool } from '../../../browser/tool/draggable';
import { Viewer } from '../../../browser/viewer/viewer';
import { ViewState } from '../../view-state';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import { ViewerEventTarget } from '../../../browser/interface/viewer-event-target';

export class WindowTool extends DraggableTool implements ViewerEventTarget {

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);
		const dragInfo = this.dragInfo;
		const viewState = ev.viewer.getState();
		this.windowWidthBy(viewState, dragInfo.dx * ( ev.original.ctrlKey ? 20 : 5 ));
		this.windowLevelBy(viewState, dragInfo.dy * ( ev.original.ctrlKey ? 2 : 1 ));
		ev.viewer.setState(viewState);
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
