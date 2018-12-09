import { Vector2, Vector3 } from 'three';
import { sectionEquals, translateSection } from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import { DicomVolumeMetadata } from '../../image-source/volume-loader/DicomVolumeLoader';
import { sectionOverlapsVolume } from '../../section-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import { MprViewState } from '../../ViewState';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import { Tool } from '../Tool';

/**
 * HandTool is a tool which responds to a mouse drag and moves the
 * MprImageSource in parallel with the screen.
 */
export default class HandTool extends DraggableTool implements Tool {
  public activate(viewer: Viewer) {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer) {
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

    const viewer = ev.viewer;
    const state = viewer.getState();
    const vp = viewer.getViewport();
    const resolution = viewer.getResolution();

    switch (state.type) {
      case 'mpr':
        const comp = viewer.getComposition();
        if (!comp) throw new Error('Composition not initialized'); // should not happen
        const src = comp.imageSource as MprImageSource;
        if (!(src instanceof MprImageSource)) return;
        viewer.setState(
          this.translateBy(
            state,
            new Vector2(dragInfo.dx, dragInfo.dy),
            new Vector2().fromArray(vp),
            new Vector2().fromArray(resolution),
            src.metadata!
          )
        );

        break;
      case 'vr':
        // TODO: Implement hand tool
        break;
    }
  }

  private translateBy(
    state: MprViewState,
    move: Vector2,
    vp: Vector2,
    resolution: Vector2,
    metadata: DicomVolumeMetadata
  ): MprViewState {
    const prevSection = state.section;
    const moveScale = move.clone().divide(vp);
    const mmSection = translateSection(
      prevSection,
      new Vector3().addVectors(
        new Vector3().fromArray(prevSection.xAxis).multiplyScalar(-moveScale.x),
        new Vector3().fromArray(prevSection.yAxis).multiplyScalar(-moveScale.y)
      )
    );

    // If the section has no changed, return the state as is.
    if (sectionEquals(prevSection, mmSection)) {
      return state;
    }

    // If the section does not overlap the volume, return the state as is (reject the processing).
    const overlap = sectionOverlapsVolume(
      mmSection,
      resolution,
      new Vector3().fromArray(metadata.voxelSize),
      new Vector3().fromArray(metadata.voxelCount)
    );
    return overlap ? { ...state, section: mmSection } : state;
  }
}
