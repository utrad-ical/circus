import { DraggableTool } from '../../../browser/tool/draggable';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';

/**
 * WindowTool handles mouse drag and modifies the window level/width accordingly.
 */
export class WindowTool extends DraggableTool {
  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;
    const state = ev.viewer.getState();
    const viewWindow = state.window;
    if (!viewWindow) return;
    const speed = ev.original.ctrlKey ? 5 : 1;
    viewWindow.level += dragInfo.dy * speed;
    viewWindow.width += dragInfo.dx * speed;
    if (viewWindow.width < 1) viewWindow.width = 1;
    ev.viewer.setState(state);
  }
}
