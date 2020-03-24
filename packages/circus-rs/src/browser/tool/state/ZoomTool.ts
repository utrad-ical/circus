import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import DraggableTool from '../DraggableTool';
import { Tool } from '../Tool';
import handleZoomBy from './handleZoomBy';

/**
 * ZoomTool
 */
export default class ZoomTool extends DraggableTool implements Tool {
  /**
   * Holds the current zoom step relative to the drag start time
   */
  private currentStep: number | undefined;

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

    const step = Math.round(-dragInfo.totalDy / 15);
    if (step === this.currentStep) return;

    handleZoomBy(ev.viewer, step - this.currentStep!, [
      ev.viewerX!,
      ev.viewerY!
    ]);
    this.currentStep = step;
  }

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    this.currentStep = 0;
  }
}
