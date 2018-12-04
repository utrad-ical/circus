import { Vector2 } from 'three';
import ViewerEvent from '../../viewer/ViewerEvent';
import ToolBaseClass, { Tool } from '../Tool';
import { MprViewState } from '../../ViewState';
import {
  convertScreenCoordinateToVolumeCoordinate,
  detectOrthogonalSection
} from '../../section-util';
import PlaneFigure, { FigureType } from '../../annotation/PlaneFigure';
import Viewer from '../../viewer/Viewer';

/**
 * PlaneFigureTool creates and edits PlaneFigure.
 */
export default class PlaneFigureTool extends ToolBaseClass implements Tool {
  private focusedFigure?: PlaneFigure;
  protected usePointerLockAPI = false;
  protected figureType: FigureType = 'circle';

  private totalMovementX: number | undefined = undefined;
  private totalMovementY: number | undefined = undefined;

  public activate(viewer: Viewer) {
    viewer.primaryEventTarget = this;
  }

  public deactivate(viewer: Viewer) {
    viewer.primaryEventTarget = undefined;
  }

  public mouseMoveHandler(ev: ViewerEvent) {
    ev.stopPropagation();
  }
    public dragStartHandler(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;

    const section = viewState.section;
    const orientation = detectOrthogonalSection(section);
    if (orientation !== 'axial') return;

    ev.viewer.canvas.requestPointerLock();

    const resolution: [number, number] = ev.viewer.getResolution();
    const screenPoint: [number, number] = [ev.viewerX!, ev.viewerY!];

    this.totalMovementX = 0;
    this.totalMovementY = 0;

    // Create figure
    const fig = new PlaneFigure();
    fig.type = this.figureType;
    fig.editable = true;
    const min = convertScreenCoordinateToVolumeCoordinate(
      section,
      new Vector2().fromArray(resolution),
      new Vector2().fromArray(screenPoint)
    );
    fig.min = [min.x, min.y];
    fig.max = [min.x, min.y];
    fig.z = min.z;

    comp.addAnnotation(fig);
    comp.annotationUpdated();
    this.focusedFigure = fig;

    ev.stopPropagation();
  }

  public dragHandler(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;

    const section = viewState.section;
    const orientation = detectOrthogonalSection(section);
    if (orientation !== 'axial') return;

    if (!this.focusedFigure) return;

    const resolution: [number, number] = ev.viewer.getResolution();
    const screenPoint: [number, number] = [
      ev.viewerX! + this.totalMovementX!,
      ev.viewerY! + this.totalMovementY!
    ];

    this.totalMovementX += ev.original.movementX;
    this.totalMovementY += ev.original.movementY;

    // Update figure
    const max = convertScreenCoordinateToVolumeCoordinate(
      (ev.viewer.getState() as MprViewState).section,
      new Vector2().fromArray(resolution),
      new Vector2().fromArray(screenPoint)
    );
    this.focusedFigure.max = [max.x, max.y];
    comp.annotationUpdated();

    ev.stopPropagation();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    document.exitPointerLock();

    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const fig = this.focusedFigure;
    if (!fig) return;

    if(fig.min && fig.max && fig.min[0] !== fig.max[0] && fig.min[1] !== fig.max[1]) {
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
    } else {
      comp.removeAnnotation(fig);
    }

    this.totalMovementX = undefined;
    this.totalMovementY = undefined;
    this.focusedFigure = undefined;

    comp.annotationUpdated();

    ev.stopPropagation();
  }
}
