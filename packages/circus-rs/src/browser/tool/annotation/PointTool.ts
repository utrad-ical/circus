import Annotation from '../../annotation/Annotation';
import Point from '../../annotation/Point';
import ViewerEvent from '../../viewer/ViewerEvent';
import ViewState, {
  MprViewState,
  TwoDimensionalViewState
} from '../../ViewState';
import { convertViewerPointToVolumePoint } from '../tool-util';
import AnnotationToolBase from './AnnotationToolBase';

/**
 * PointTool makes a Point annotation on a mouse click.
 */
export default class PointTool extends AnnotationToolBase {
  protected focusedAnnotation?: Point;

  protected createAnnotation(ev: ViewerEvent): Annotation | undefined {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    const point = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );
    const antn = new Point();
    antn.location = [point.x, point.y, point.z];
    return antn;
  }

  protected updateAnnotation(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    if (!this.focusedAnnotation) return;
    const point = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );
    const antn = this.focusedAnnotation;
    antn.location = [point.x, point.y, point.z];
  }

  protected concreteAnnotation(ev: ViewerEvent): void {
    // Nothing to do
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
