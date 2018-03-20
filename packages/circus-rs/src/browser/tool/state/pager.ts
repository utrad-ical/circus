import { DraggableTool } from '../../../browser/tool/draggable';
import { ViewerEvent } from '../../../browser/viewer/viewer-event';
import MprImageSource from '../../image-source/MprImageSource';
import { orientationAwareTranslation } from '../../section-util';

/**
 * PagerTool handles mouse drag and performs the paging of the stacked images.
 */
export class PagerTool extends DraggableTool {
  private currentStep: number;

  public dragHandler(ev: ViewerEvent): void {
    super.dragEndHandler(ev);
    const dragInfo = this.dragInfo;
    const viewer = ev.viewer;
    const state = viewer.getState();

    const step = Math.floor(dragInfo.totalDy / 10);
    const relativeStep = step - this.currentStep;
    if (relativeStep === 0) return;

    const comp = viewer.getComposition();
    if (!comp) throw new Error('Composition not initialized'); // should not happen
    const src = comp.imageSource as MprImageSource;
    if (!(src instanceof MprImageSource)) return;
    const voxelSize = src.metadata.voxelSize;

    state.section = orientationAwareTranslation(
      state.section,
      voxelSize,
      relativeStep
    );
    viewer.setState(state);

    this.currentStep = step;
  }

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    this.currentStep = 0;
  }
}
