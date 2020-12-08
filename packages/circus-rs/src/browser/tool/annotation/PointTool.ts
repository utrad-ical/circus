import Annotation from '../../annotation/Annotation';
import Point from '../../annotation/Point';
import ViewerEvent from '../../viewer/ViewerEvent';
import { getVolumeCoordinateFromViewerEvent } from '../tool-util';
import AnnotationToolBase from './AnnotationToolBase';

/**
 * PointTool makes a Point annotation on a mouse click.
 */
export default class PointTool extends AnnotationToolBase {
  protected focusedAnnotation?: Point;

  protected createAnnotation(ev: ViewerEvent): Annotation | undefined {
    const point = getVolumeCoordinateFromViewerEvent(ev);
    const antn = new Point();
    antn.origin = [point.x, point.y, point.z];
    return antn;
  }

  protected updateAnnotation(ev: ViewerEvent): void {
    if (!this.focusedAnnotation) return;
    const point = getVolumeCoordinateFromViewerEvent(ev);
    const antn = this.focusedAnnotation;
    antn.origin = [point.x, point.y, point.z];
  }

  protected concreteAnnotation(ev: ViewerEvent): void {
    // Nothing to do
  }

  protected validateAnnotation(): boolean {
    if (!this.focusedAnnotation) return false;
    return this.focusedAnnotation.validate();
  }
}
