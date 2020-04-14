import { Vector2, Vector3 } from 'three';
import Cuboid from '../../annotation/Cuboid';
import Ellipsoid from '../../annotation/Ellipsoid';
import SolidFigure, { FigureType } from '../../annotation/SolidFigure';
import {
  convertScreenCoordinateToVolumeCoordinate,
  detectOrthogonalSection
} from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import ToolBaseClass, { Tool } from '../Tool';

/**
 * SolidFigureTool creates and edits SolidFigure.
 */
export default class SolidFigureTool extends ToolBaseClass implements Tool {
  private focusedFigure?: SolidFigure;
  protected usePointerLockAPI: boolean = false;
  protected figureType: FigureType = 'cuboid';

  private totalMovementX: number | undefined = undefined;
  private totalMovementY: number | undefined = undefined;

  public activate(viewer: Viewer): void {
    viewer.primaryEventTarget = this;
  }

  public deactivate(viewer: Viewer): void {
    viewer.primaryEventTarget = undefined;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    ev.stopPropagation();
  }
  public dragStartHandler(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;
    const section = viewState.section;
    const orientation = detectOrthogonalSection(section);

    ev.viewer.canvas.requestPointerLock();

    const resolution: [number, number] = ev.viewer.getResolution();
    const screenPoint: [number, number] = [ev.viewerX!, ev.viewerY!];

    this.totalMovementX = 0;
    this.totalMovementY = 0;

    // Create figure
    if (!SolidFigure.editableOrientation.some(o => o === orientation)) return;
    const min = convertScreenCoordinateToVolumeCoordinate(
      section,
      new Vector2().fromArray(resolution),
      new Vector2().fromArray(screenPoint)
    );
    const fig = this.createFigure(min.toArray());

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
      viewState.section,
      new Vector2().fromArray(resolution),
      new Vector2().fromArray(screenPoint)
    );

    this.focusedFigure.max = max.toArray();
    comp.annotationUpdated();

    ev.stopPropagation();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    document.exitPointerLock();

    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const fig = this.focusedFigure;
    if (!fig) return;

    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;

    if (fig.validate()) {
      const orientation = detectOrthogonalSection(viewState.section);
      fig.concreate(orientation);
    } else {
      comp.removeAnnotation(fig);
    }

    this.totalMovementX = undefined;
    this.totalMovementY = undefined;
    this.focusedFigure = undefined;

    comp.annotationUpdated();

    ev.stopPropagation();
  }

  private createFigure(min: number[], max?: number[]): SolidFigure {
    const origin = new Vector3().fromArray(min);
    const terminus = max
      ? new Vector3().fromArray(max)
      : new Vector3().fromArray(min);

    let fig: SolidFigure;
    switch (this.figureType) {
      case 'ellipsoid':
        fig = new Ellipsoid();
        break;
      case 'cuboid':
      default:
        fig = new Cuboid();
        break;
    }
    fig.min = origin.toArray();
    fig.max = terminus.toArray();
    fig.editable = true;
    fig.resetDepthOfBoundingBox = true;
    if (!origin.equals(terminus)) {
      fig.concreate();
    }
    return fig;
  }
}
