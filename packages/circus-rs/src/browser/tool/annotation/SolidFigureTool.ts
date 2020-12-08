import Annotation from '../../annotation/Annotation';
import Cuboid from '../../annotation/Cuboid';
import Ellipsoid from '../../annotation/Ellipsoid';
import SolidFigure, { FigureType } from '../../annotation/SolidFigure';
import { detectOrthogonalSection } from '../../section-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import { getVolumeCoordinateFromViewerEvent } from '../tool-util';
import AnnotationToolBase from './AnnotationToolBase';

/**
 * SolidFigureTool creates and edits SolidFigure.
 */
export default class SolidFigureTool extends AnnotationToolBase {
  protected focusedAnnotation?: SolidFigure;
  protected figureType: FigureType = 'cuboid';

  protected createAnnotation(ev: ViewerEvent): Annotation | undefined {
    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;
    const section = viewState.section;
    const orientation = detectOrthogonalSection(section);
    if (!SolidFigure.editableOrientation.some(o => o === orientation)) return;

    const point = getVolumeCoordinateFromViewerEvent(ev);

    let antn: SolidFigure;
    switch (this.figureType) {
      case 'ellipsoid':
        antn = new Ellipsoid();
        break;
      case 'cuboid':
      default:
        antn = new Cuboid();
        break;
    }
    antn.min = point.toArray();
    antn.max = point.toArray();
    antn.editable = true;
    antn.resetDepthOfBoundingBox = true;
    return antn;
  }

  protected updateAnnotation(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;

    if (!this.focusedAnnotation) return;

    const max = getVolumeCoordinateFromViewerEvent(ev);
    const antn = this.focusedAnnotation;
    antn.max = max.toArray();
  }

  protected concreteAnnotation(ev: ViewerEvent): void {
    const antn = this.focusedAnnotation;
    if (!antn) return;

    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;

    const orientation = detectOrthogonalSection(viewState.section);
    antn.concrete(orientation);
  }

  protected validateAnnotation(): boolean {
    if (!this.focusedAnnotation) return false;
    return this.focusedAnnotation.validate();
  }
}
