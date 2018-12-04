import DraggableTool from '../DraggableTool';
import ViewerEvent from '../../viewer/ViewerEvent';
import Viewer from '../../viewer/Viewer';
import { Tool } from '../Tool';

/**
 * WindowTool handles mouse drag and modifies the window level/width accordingly.
 */
export default class WindowTool extends DraggableTool implements Tool {
  public activate(viewer: Viewer) {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer) {
    viewer.backgroundEventTarget = null;
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;
    const state = ev.viewer.getState();
    if (state.type !== 'mpr') throw new Error('Unsupported view state');

    const viewWindow = state.window;
    if (!viewWindow) return;
    const speed = ev.original.ctrlKey ? 5 : 1;
    viewWindow.level += dragInfo.dy * speed;
    viewWindow.width += dragInfo.dx * speed;
    if (viewWindow.width < 1) viewWindow.width = 1;
    ev.viewer.setState(state);
  }
}
