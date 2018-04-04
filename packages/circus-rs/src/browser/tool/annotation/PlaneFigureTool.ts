import { Vector2, Vector3 } from 'three';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import ViewState from '../../ViewState';
import ViewerEvent from '../../viewer/ViewerEvent';
import { convertScreenCoordinateToVolumeCoordinate } from '../../section-util';
import { Section, vectorizeSection } from '../../../common/geometry';
import PlaneFigure, { FigureType } from '../../annotation/PlaneFigure';

/**
 * PlaneFigureTool creates and edits PlaneFigure.
 */
export default class PlaneFigureTool extends DraggableTool {
  private tmpAnnotation?: PlaneFigure;
  protected figureType: FigureType = 'circle';

  public dragStartHandler(ev: ViewerEvent): void {
    super.dragStartHandler(ev);
    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;

    const comp = ev.viewer.getComposition();
    if (!comp) return;
    const fig = new PlaneFigure();
    fig.type = this.figureType;
    fig.min = [ev.viewerX!, ev.viewerY!];
    comp.addAnnotation(fig);
    comp.annotationUpdated();
    this.tmpAnnotation = fig;
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const comp = ev.viewer.getComposition();
    if (!comp) return;
    const fig = this.tmpAnnotation!;
    fig.max = [ev.viewerX!, ev.viewerY!];
    comp.annotationUpdated();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    this.tmpAnnotation = undefined;
  }
}
