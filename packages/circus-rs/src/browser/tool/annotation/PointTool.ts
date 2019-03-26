import { Vector2, Vector3 } from 'three';
import Point from '../../annotation/Point';
import { convertScreenCoordinateToVolumeCoordinate } from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import DraggableTool from '../DraggableTool';
import ViewState, { MprViewState } from '../../ViewState';

/**
 * PointTool makes a Point annotation on a mouse click.
 */
export default class PointTool extends DraggableTool {
  protected usePointerLockAPI: boolean = false;
  private drawing: Point | null = null;

  public activate(viewer: Viewer): void {
    viewer.backgroundEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.backgroundEventTarget = null;
  }

  private toVolumeCoordinate(
    viewState: MprViewState,
    ev: ViewerEvent
  ): Vector3 {
    const screenPoint = [ev.viewerX!, ev.viewerY!];
    const resolution = ev.viewer.getResolution();
    const section = viewState.section;
    return convertScreenCoordinateToVolumeCoordinate(
      section,
      new Vector2().fromArray(resolution),
      new Vector2().fromArray(screenPoint)
    );
  }

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    const comp = ev.viewer.getComposition();
    if (!comp) return;
    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;

    const point = new Point();
    const location = this.toVolumeCoordinate(viewState, ev);
    point.x = location.x;
    point.y = location.y;
    point.z = location.z;
    comp.addAnnotation(point);
    this.drawing = point;
    comp.annotationUpdated();
  }

  public dragHandler(ev: ViewerEvent): void {
    if (!this.drawing) return;
    const point = this.drawing;
    const comp = ev.viewer.getComposition()!;
    const viewState = ev.viewer.getState() as MprViewState;
    const location = this.toVolumeCoordinate(viewState, ev);
    point.x = location.x;
    point.y = location.y;
    point.z = location.z;
    comp.annotationUpdated();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    this.drawing = null;
  }
}
