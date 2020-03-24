import ViewerEvent from '../../viewer/ViewerEvent';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import { Tool } from '../Tool';
import handlePageBy from './handlePageBy';

/**
 * PagerTool handles mouse drag and performs the paging of the stacked images.
 */
export default class PagerTool extends DraggableTool implements Tool {
  private currentStep: number | undefined;

  constructor() {
    super();
  }

  public activate(viewer: Viewer): void {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.backgroundEventTarget = null;
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const dragInfo = this.dragInfo;

    const step = Math.floor(dragInfo.totalDy / 10);
    if (step === this.currentStep) return;

    const relativeStep = step - this.currentStep!;
    handlePageBy(ev.viewer, relativeStep);
    this.currentStep = step;
  }

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    this.currentStep = 0;
  }
}
