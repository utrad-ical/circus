import Polyline from '../../annotation/Polyline';
import { detectOrthogonalSection } from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import ToolBaseClass, { ToolOptions } from '../Tool';
import { convertViewerPointToVolumePoint } from '../tool-util';

/**
 * PolylineTool creates and edits Polyline.
 */
export default class PolylineTool extends ToolBaseClass<ToolOptions> {
  protected focusedAnnotation?: Polyline;

  public activate(viewer: Viewer): void {
    // TODO:doramari
    viewer.backgroundEventTarget = this;
    viewer.primaryEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    // TODO:doramari
    viewer.backgroundEventTarget = null;
    viewer.primaryEventTarget = undefined;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    ev.stopPropagation();
  }

  public dragStartHandler(ev: ViewerEvent): void {
    // TODO:doramari
    const comp = ev.viewer.getComposition();
    if (!comp) return;
    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;
    const section = viewState.section;
    const orientation = detectOrthogonalSection(section);
    if (orientation !== 'axial') return;

    const antn = this.focusedAnnotation
      ? this.updateAnnotation(ev, this.focusedAnnotation)
      : this.createAnnotation(ev);

    comp.addAnnotation(antn);
    this.focusedAnnotation = antn;
    comp.annotationUpdated();
  }

  public dragHandler(ev: ViewerEvent): void {
    // TODO:doramari
  }

  public dragEndHandler(ev: ViewerEvent): void {
    // TODO:doramari
  }

  protected createAnnotation(ev: ViewerEvent): Polyline {
    // TODO: Check the Tool default settings
    const point = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );
    const antn = new Polyline();
    antn.editable = true;
    antn.points.push([point.x, point.y]);
    antn.z = point.z;
    return antn;
  }

  protected updateAnnotation(ev: ViewerEvent, antn: Polyline): Polyline {
    const point = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );
    antn.points.push([point.x, point.y]);
    return antn;
  }

  protected concreteAnnotation(ev: ViewerEvent): void {
    // TODO:doramari
  }

  protected validateAnnotation(): boolean {
    if (!this.focusedAnnotation) return false;
    return this.focusedAnnotation.validate();
  }
}
