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
    const ex = ev.viewerX!;
    const ey = ev.viewerY!;
    const start = convertViewerPointToVolumePoint(ev.viewer, ex, ey);

    const antn = new Ruler();
    antn.section = { ...section };
    antn.start = [start.x, start.y, start.z];
    antn.end = [start.x, start.y, start.z];
    antn.editable = true;

    const assumedTextBoxSize = [60, 20];
    const w = ev.viewerWidth!;
    const h = ev.viewerHeight!;
    const px = ex + assumedTextBoxSize[0] < w ? 0 : -assumedTextBoxSize[0];
    const py = ey + assumedTextBoxSize[1] + 5 < h ? 5 : -assumedTextBoxSize[1];

    antn.labelPosition = [px, py];
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
