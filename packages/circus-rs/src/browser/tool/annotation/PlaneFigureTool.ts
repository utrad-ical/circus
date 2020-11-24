import { Annotation } from '../..';
import PlaneFigure, { FigureType } from '../../annotation/PlaneFigure';
import { detectOrthogonalSection } from '../../section-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import { getVolumeCoordinateFromViewerEvent } from '../tool-util';
import AnnotationToolBase from './AnnotationToolBase';

/**
 * PlaneFigureTool creates and edits PlaneFigure.
 */
export default class PlaneFigureTool extends AnnotationToolBase {
  protected focusedAnnotation?: PlaneFigure;
  protected figureType: FigureType = 'circle';

  protected createAnnotation(ev: ViewerEvent): Annotation | undefined {
    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;
    const section = viewState.section;
    const orientation = detectOrthogonalSection(section);
    if (orientation !== 'axial') return;

    const point = getVolumeCoordinateFromViewerEvent(ev);

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
    if (!viewState || viewState.type !== 'mpr') return;

    if (!this.focusedAnnotation) return;

    const point = getVolumeCoordinateFromViewerEvent(ev);
    const antn = this.focusedAnnotation;
    antn.max = [point.x, point.y];
  }

  protected concreteAnnotation(ev: ViewerEvent): void {
    if (!this.focusedAnnotation) return;

    const antn = this.focusedAnnotation;

    if (
      antn.min &&
      antn.max &&
      antn.min[0] !== antn.max[0] &&
      antn.min[1] !== antn.max[1]
    ) {
      const newMin = [
        Math.min(antn.min[0], antn.max[0]),
        Math.min(antn.min[1], antn.max[1])
      ];
      const newMax = [
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
}
