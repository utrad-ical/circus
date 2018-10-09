import { Box3, Vector2, Vector3 } from 'three';
import { isNullOrUndefined } from 'util';
import {
  intersectionOfBoxAndPlane,
  intersectionPointWithinSection,
  sectionEquals,
  translateSection
} from '../../../common/geometry';
import MprImageSource from '../../image-source/MprImageSource';
import { DicomVolumeMetadata } from '../../image-source/volume-loader/DicomVolumeLoader';
import { convertSectionToIndex } from '../../section-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import { MprViewState } from '../../ViewState';
import DraggableTool from '../DraggableTool';

/**
 * HandTool is a tool which responds to a mouse drag and moves the
 * MprImageSource in parallel with the screen.
 */
export default class HandTool extends DraggableTool {
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
    metadata: DicomVolumeMetadata
  ): MprViewState {
    const section = state.section;
    const moveScale = move.clone().divide(vp);
    const newSection = translateSection(
      section,
      new Vector3().addVectors(
        new Vector3().fromArray(section.xAxis).multiplyScalar(-moveScale.x),
        new Vector3().fromArray(section.yAxis).multiplyScalar(-moveScale.y)
      )
    );

    // Check whether new section is outside display area, and if so, reject the processing.
    const voxelSize = new Vector3().fromArray(metadata.voxelSize);
    const voxelCount = metadata.voxelCount;
    const indexNewSection = convertSectionToIndex(newSection, voxelSize);
    const box = new Box3(
      new Vector3(0, 0, 0),
      new Vector3().fromArray(voxelCount)
    );
    const intersectionPoints = intersectionOfBoxAndPlane(box, indexNewSection);
    if (
      isNullOrUndefined(intersectionPoints) ||
      !intersectionPoints.some(p =>
        intersectionPointWithinSection(indexNewSection, p)
      )
    ) {
      return state;
    }

    // If section has no changed, return state as is.
    if (sectionEquals(section, newSection)) {
      return state;
    }

    // Return state with new section.
    return { ...state, section: newSection };
  }
}
