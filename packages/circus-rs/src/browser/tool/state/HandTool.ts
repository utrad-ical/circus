import DraggableTool from '../DraggableTool';
import ViewerEvent from '../../viewer/ViewerEvent';
import { MprViewState } from '../../ViewState';
import { translateSection, equals } from '../../../common/geometry';
import { Vector2, Vector3 } from 'three';

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
        viewer.setState(
          this.translateBy(
            state,
            new Vector2(dragInfo.dx, dragInfo.dy),
            new Vector2().fromArray(vp)
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
    vp: Vector2
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
    const xBoundaryAbs = Math.abs(vp.x / 2) + Math.abs(section.xAxis[0] / 2);
    if (Math.abs(newSection.origin[0]) >= xBoundaryAbs) {
      newSection.origin[0] = section.origin[0];
    }
    const yBoundaryAbs = Math.abs(vp.y / 2) + Math.abs(section.yAxis[1] / 2);
    if (Math.abs(newSection.origin[1]) >= yBoundaryAbs) {
      newSection.origin[1] = section.origin[1];
    }

    // If section has no changed, return state as is.
    const hasAnyChanged = !equals(section, newSection);
    return hasAnyChanged ? { ...state, section: newSection } : state;
  }
}
