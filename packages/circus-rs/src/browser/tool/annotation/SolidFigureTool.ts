import { Vector3D } from '../../../common/geometry';
import Annotation from '../../annotation/Annotation';
import Cuboid from '../../annotation/Cuboid';
import Ellipsoid from '../../annotation/Ellipsoid';
import SolidFigure, { FigureType } from '../../annotation/SolidFigure';
import { detectOrthogonalSection } from '../../section-util';
import ViewerEvent from '../../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../../ViewState';
import { convertViewerPointToVolumePoint } from '../tool-util';
import AnnotationToolBase from './AnnotationToolBase';

/**
 * SolidFigureTool creates and edits SolidFigure.
 */
export default class SolidFigureTool extends AnnotationToolBase {
  protected focusedAnnotation?: SolidFigure;
  protected figureType: FigureType = 'cuboid';

  protected createAnnotation(ev: ViewerEvent): Annotation | undefined {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    const section = viewState.section;

    const orientation = detectOrthogonalSection(section);
    if (!SolidFigure.editableOrientation.some(o => o === orientation)) return;

    const point = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!,
      viewState
    );

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
    antn.min = point.toArray() as Vector3D;
    antn.max = point.toArray() as Vector3D;
    antn.editable = true;
    antn.resetDepthOfBoundingBox = true;
    return antn;
  }

  protected updateAnnotation(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const viewState = ev.viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    if (!this.focusedAnnotation) return;

    const max = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!,
      viewState
    );
    const antn = this.focusedAnnotation;
    antn.max = max.toArray() as Vector3D;
  }

  protected concreteAnnotation(ev: ViewerEvent): void {
    const antn = this.focusedAnnotation;
    if (!antn) return;

    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    const section = viewState.section;
    const orientation = detectOrthogonalSection(viewState.section);
    antn.concrete(orientation);
  }

  protected validateAnnotation(): boolean {
    if (!this.focusedAnnotation) return false;
    return this.focusedAnnotation.validate();
  }

  protected isValidViewState(
    state: ViewState | undefined
  ): state is MprViewState {
    if (!state) return false;
    if (state.type === 'mpr') return true;
    return false;
  }
}
