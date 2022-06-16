import { ViewWindow } from '../../../common/ViewWindow';
import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import DraggableTool from '../DraggableTool';
import { Tool } from '../Tool';

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

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    const viewer = ev.viewer;

    const viewState = viewer.getState();
    if (!viewState) throw new Error('View state not initialized');
    if (viewState.type !== 'mpr' && viewState.type !== '2d')
      throw new Error('Unsupported view state');

    if (!viewState.window) {
      alert('You cannot change the window of color images.');
      return;
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const viewer = ev.viewer;

    const viewState = viewer.getState();
    if (!viewState) throw new Error('View state not initialized');
    if (viewState.type !== 'mpr' && viewState.type !== '2d')
      throw new Error('Unsupported view state');

    const viewWindow = viewState.window;
    if (!viewWindow) throw new Error('Unsupported view state'); // probably rgba8 data

    const dragInfo = this.dragInfo;
    const speed = ev.original.ctrlKey ? 5 : 1;
    const newWindow: ViewWindow = {
      level: viewWindow.level + dragInfo.dy * speed,
      width: Math.max(1, viewWindow.width + dragInfo.dx * speed)
    };

    viewer.setState({ ...viewState, window: newWindow });
  }
}
