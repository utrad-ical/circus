import { Vector2, Vector3 } from 'three';
import MprImageSource from '../../image-source/MprImageSource';
import { DicomVolumeMetadata } from '../../image-source/volume-loader/DicomVolumeLoader';
import {
  orientationAwareTranslation,
  sectionOverlapsVolume
} from '../../section-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import { MprViewState } from '../../ViewState';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import { Tool } from '../Tool';

/**
 * PagerTool handles mouse drag and performs the paging of the stacked images.
 */
export default class PagerTool extends DraggableTool implements Tool {
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
    const viewer = ev.viewer;
    const state = viewer.getState();
    const resolution = viewer.getResolution();

    switch (state.type) {
      case 'mpr':
        const step = Math.floor(dragInfo.totalDy / 10);
        const relativeStep = step - this.currentStep!;
        if (relativeStep === 0) return;

        const comp = viewer.getComposition();
        if (!comp) throw new Error('Composition not initialized'); // should not happen
        const src = comp.imageSource as MprImageSource;
        if (!(src instanceof MprImageSource)) return;

        this.currentStep = step;
        viewer.setState(
          this.translateBy(
            state,
            relativeStep,
            new Vector2().fromArray(resolution),
            src.metadata!
          )
        );
        break;
      case 'vr':
        break;
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    this.currentStep = 0;
  }

  private translateBy(
    state: MprViewState,
    relativeStep: number,
    resolution: Vector2,
    metadata: DicomVolumeMetadata
  ): MprViewState {
    const mmSection = orientationAwareTranslation(
      state.section,
      metadata.voxelSize,
      relativeStep
    );

    const overlap = sectionOverlapsVolume(
      mmSection,
      resolution,
      new Vector3().fromArray(metadata.voxelSize),
      new Vector3().fromArray(metadata.voxelCount)
    );

    return overlap ? { ...state, section: mmSection } : state;
  }
}
