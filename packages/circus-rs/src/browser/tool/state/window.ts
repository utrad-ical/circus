import { DraggableTool } from '../../../browser/tool/draggable';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';

/**
 * WindowTool handles mouse drag and modifies the window level/width accordingly.
 */
export class WindowTool extends DraggableTool {

	public dragHandler(ev: ViewerEvent): void {
		super.dragHandler(ev);
		const dragInfo = this.dragInfo;
		const viewState = ev.viewer.getState();
		const speed = ev.original.ctrlKey ? 5 : 1;
		viewState.window.level += dragInfo.dy * speed;
		viewState.window.width += dragInfo.dx * speed;
		if (viewState.window.width < 1) viewState.window.width = 1;
		ev.viewer.setState(viewState);
	}

}
