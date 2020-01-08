import MprImageSource from '../../image-source/MprImageSource';
import { createOrthogonalMprSection } from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ToolBaseClass, { Tool } from '../Tool';

/**
 * ResetPlanes
 */
export default class ResetPlanes extends ToolBaseClass implements Tool {
  private counter: number = 0;
  private viewersToSet: [Viewer, 'axial' | 'coronal' | 'sagittal'][] = [];
  private wait: boolean = false;

  public activate(viewer: Viewer): void {
    const orientations: ('axial' | 'coronal' | 'sagittal')[] = [
      'axial',
      'sagittal',
      'coronal'
    ];

    const orientation = orientations[this.counter++ % orientations.length];
    this.viewersToSet.push([viewer, orientation]);

    if (!this.wait) {
      this.wait = true;
      setTimeout(() => this.run(), 50);
    }
  }

  private run(): void {
    this.viewersToSet.forEach(([viewer, orientation]) => {
      const position: number | undefined = undefined;

      const state = viewer.getState();
      if (state.type !== 'mpr') return;
      const comp = viewer.getComposition();
      if (!comp) return;

      const imageSource = comp.imageSource as MprImageSource;
      const mmDim = imageSource.mmDim();

      state.section = createOrthogonalMprSection(
        viewer.getResolution(),
        mmDim,
        orientation,
        position
      );
      viewer.setState(state);
      viewer.setActiveTool(undefined);

      // clear tool state
      this.counter = 0;
      this.wait = false;
      this.viewersToSet = [];
    });
  }

  public deactivate(viewer: Viewer): void {}
}
