import DraggableTool from '../DraggableTool.ts';
import type ViewerEvent from '../../viewer/ViewerEvent.ts';
import type Viewer from '../../viewer/Viewer.ts';
import type { Tool } from '../Tool.ts';
import handleRotationBy from './handleRotationBy.ts';

/**
 * CelestialRotateTool handles mouse drags and wheel moves on the Viewer and
 * rotates the MPR section accordingly.
 */
export default class CelestialRotateTool extends DraggableTool implements Tool {
  public activate(viewer: Viewer): void {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.backgroundEventTarget = null;
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;

    if (dragInfo.dx === 0 && dragInfo.dy === 0) return;

    const viewer = ev.viewer;

    // Angle(degree) per moving 1px
    const speed = ev.original.ctrlKey ? 2.0 : 0.3;
    handleRotationBy(viewer, dragInfo.dx * speed, dragInfo.dy * speed);
  }
}
