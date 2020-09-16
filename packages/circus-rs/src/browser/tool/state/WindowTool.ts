import DraggableTool from '../DraggableTool';
import ViewerEvent from '../../viewer/ViewerEvent';
import Viewer from '../../viewer/Viewer';
import { Tool } from '../Tool';
import { ViewWindow } from 'circus-rs/src/common/ViewWindow';

/**
 * WindowTool handles mouse drag and modifies the window level/width accordingly.
 */
export default class WindowTool extends DraggableTool implements Tool {
  public activate(viewer: Viewer): void {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.backgroundEventTarget = null;
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;
    const state = ev.viewer.getState();
    if (state.type !== 'mpr') throw new Error('Unsupported view state');

    const viewWindow = state.window;
    const speed = ev.original.ctrlKey ? 5 : 1;
    const newWindow: ViewWindow = {
      level: viewWindow.level + dragInfo.dy * speed,
      width: Math.max(1, viewWindow.width + dragInfo.dx * speed)
    };
    ev.viewer.setState({ ...state, window: newWindow });
  }
}
