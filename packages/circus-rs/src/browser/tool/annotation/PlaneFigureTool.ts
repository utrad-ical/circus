import type { Vector2D } from '../../../common/geometry/index.ts';
import type Annotation from '../../annotation/Annotation.ts';
import type { FigureType } from '../../annotation/PlaneFigure.ts';
import PlaneFigure from '../../annotation/PlaneFigure.ts';
import {
  detectOrthogonalSection,
  sectionFrom2dViewState
} from '../../section-util.ts';
import type ViewerEvent from '../../viewer/ViewerEvent.ts';
import type { MprViewState, TwoDimensionalViewState } from '../../ViewState.ts';
import type ViewState from '../../ViewState.ts';
import { convertViewerPointToVolumePoint } from '../tool-util.ts';
import AnnotationToolBase from './AnnotationToolBase.ts';

/**
 * PlaneFigureTool creates and edits PlaneFigure.
 */
export default class PlaneFigureTool extends AnnotationToolBase {
  protected focusedAnnotation?: PlaneFigure;
  protected figureType: FigureType = 'circle';

  protected createAnnotation(ev: ViewerEvent): Annotation | undefined {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    const section =
      viewState.type !== '2d'
        ? viewState.section
        : sectionFrom2dViewState(viewState);

    const orientation = detectOrthogonalSection(section);
    if (orientation !== 'axial') return;

    const point = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );

    const antn = new PlaneFigure();
    antn.type = this.figureType;
    antn.editable = true;
    antn.min = [point.x, point.y];
    antn.max = [point.x, point.y];
    antn.z = point.z;
    return antn;
  }

  protected updateAnnotation(ev: ViewerEvent): void {
    const viewState = ev.viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    if (!this.focusedAnnotation) return;

    const point = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );
    const antn = this.focusedAnnotation;
    antn.max = [point.x, point.y];
  }

  protected materializeAnnotation(ev: ViewerEvent): void {
    if (!this.focusedAnnotation) return;

    const antn = this.focusedAnnotation;

    if (
      antn.min &&
      antn.max &&
      antn.min[0] !== antn.max[0] &&
      antn.min[1] !== antn.max[1]
    ) {
      const newMin: Vector2D = [
        Math.min(antn.min[0], antn.max[0]),
        Math.min(antn.min[1], antn.max[1])
      ];
      const newMax: Vector2D = [
        Math.max(antn.min[0], antn.max[0]),
        Math.max(antn.min[1], antn.max[1])
      ];
      antn.min = newMin;
      antn.max = newMax;
    }
  }

  protected validateAnnotation(): boolean {
    if (!this.focusedAnnotation) return false;
    return this.focusedAnnotation.validate();
  }

  protected isValidViewState(
    state: ViewState | undefined
  ): state is MprViewState | TwoDimensionalViewState {
    if (!state) return false;
    if (state.type === 'mpr') return true;
    if (state.type === '2d') return true;
    return false;
  }
}
