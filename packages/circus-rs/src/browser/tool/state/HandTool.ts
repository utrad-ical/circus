import ViewerEvent from '../../viewer/ViewerEvent';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import { Tool } from '../Tool';
import handleMoveBy from './handleMoveBy';

/**
 * HandTool is a tool which responds to a mouse drag and moves the
 * MprImageSource in parallel with the screen.
 */
export default class HandTool extends DraggableTool implements Tool {
  public activate(viewer: Viewer): void {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.backgroundEventTarget = null;
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;

    // Drag events can be triggered continuously even though there is no mouse move,
    // so we ignore events that does not represent actual mouse moves.
    if (dragInfo.dx === 0 && dragInfo.dy === 0) {
      return;
    }

    handleMoveBy(ev.viewer, dragInfo.dx, dragInfo.dy);
  }
}
