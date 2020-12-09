import Annotation from '../../annotation/Annotation';
import Ruler from '../../annotation/Ruler';
import ViewerEvent from '../../viewer/ViewerEvent';
import { convertViewerPointToVolumePoint } from '../tool-util';
import AnnotationToolBase from './AnnotationToolBase';

/**
 * RulerTool creates and edits Ruler.
 */
export default class RulerTool extends AnnotationToolBase {
  protected focusedAnnotation?: Ruler;

  protected createAnnotation(ev: ViewerEvent): Annotation | undefined {
    const viewState = ev.viewer.getState();
    const section = viewState.section;
    const origin = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );

    const antn = new Ruler();
    antn.section = { ...section };
    antn.start = [origin.x, origin.y, origin.z];
    antn.end = [origin.x, origin.y, origin.z];
    antn.editable = true;
    return antn;
  }

  protected updateAnnotation(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;

    if (!this.focusedAnnotation) return;

    const end = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );
    const antn = this.focusedAnnotation;
    antn.end = [end.x, end.y, end.z];
  }

  protected concreteAnnotation(ev: ViewerEvent): void {
    // Nothing to do
  }

  protected validateAnnotation(): boolean {
    if (!this.focusedAnnotation) return false;
    return this.focusedAnnotation.validate();
  }
}
