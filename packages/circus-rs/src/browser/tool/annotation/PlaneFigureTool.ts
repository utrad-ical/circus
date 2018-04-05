import { Vector2, Vector3 } from 'three';
import DraggableTool from '../DraggableTool';
import Viewer from '../../viewer/Viewer';
import ViewState, { MprViewState } from '../../ViewState';
import ViewerEvent from '../../viewer/ViewerEvent';
import {
  convertScreenCoordinateToVolumeCoordinate,
  detectOrthogonalSection
} from '../../section-util';
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

    const section = viewState.section;
    const orientation = detectOrthogonalSection(section);
    if (orientation !== 'axial') return;

    const comp = ev.viewer.getComposition();
    const resolution = new Vector2().fromArray(ev.viewer.getResolution());
    if (!comp) return;
    const fig = new PlaneFigure();
    fig.type = this.figureType;

    const min = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2(ev.viewerX!, ev.viewerY!)
    );
    fig.min = [min.x, min.y];
    fig.z = min.z;

    comp.addAnnotation(fig);
    comp.annotationUpdated();
    this.tmpAnnotation = fig;
  }

  public dragHandler(ev: ViewerEvent): void {
    super.dragHandler(ev);
    const comp = ev.viewer.getComposition();
    if (!comp) return;
    const fig = this.tmpAnnotation;
    if (!fig) return;

    const resolution = new Vector2().fromArray(ev.viewer.getResolution());
    const max = convertScreenCoordinateToVolumeCoordinate(
      (ev.viewer.getState() as MprViewState).section,
      resolution,
      new Vector2(ev.viewerX!, ev.viewerY!)
    );
    fig.max = [max.x, max.y];
    comp.annotationUpdated();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    super.dragEndHandler(ev);
    const comp = ev.viewer.getComposition()!;
    const fig = this.tmpAnnotation!;
    if (!fig || !fig.min || !fig.max) return;
    const newMin = [
      Math.min(fig.min[0], fig.max[0]),
      Math.min(fig.min[1], fig.max[1])
    ];
    const newMax = [
      Math.max(fig.min[0], fig.max[0]),
      Math.max(fig.min[1], fig.max[1])
    ];
    fig.min = newMin;
    fig.max = newMax;
    comp.annotationUpdated();
    this.tmpAnnotation = undefined;
  }
}
