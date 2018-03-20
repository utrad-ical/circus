import { mat4, vec3 } from 'gl-matrix';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import ViewState from '../../ViewState';
import ViewerEvent from '../../../browser/viewer/ViewerEvent';

/**
 * VrRotateZoomTool
 *
 *  Edit viewState.vrScale
 */
export default class VrRotateZoomTool extends DraggableTool {
  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const state: ViewState = viewer.getState();
    if (state.type !== 'vr') throw new Error('Unsupported view state');

    // console.log(state);

    super.dragHandler(ev);
    const dragInfo = this.dragInfo;
    const speed = ev.original.shiftKey ? 0.5 : 0.2;

    if (dragInfo.dx === 0 && dragInfo.dy === 0) return;

    const horizontal =
      typeof state.horizontal !== 'undefined'
        ? state.horizontal + dragInfo.dx * speed
        : 0;

    const vertical =
      typeof state.vertical !== 'undefined'
        ? state.vertical - dragInfo.dy * speed
        : 0;

    viewer.setState({ ...state, horizontal, vertical });
  }

  public wheelHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const state: ViewState = viewer.getState();
    if (state.type !== 'vr') throw new Error('Unsupported view state.');

    const speed = ev.original.shiftKey ? 0.005 : 0.002;
    const zoom =
      typeof state.zoom !== 'undefined'
        ? state.zoom + ev.original.deltaY * speed * -1
        : 1.0;

    viewer.setState({ ...state, zoom });
  }
}
