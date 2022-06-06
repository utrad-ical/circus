import Annotation from '../../annotation/Annotation';
import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import ViewState from '../../ViewState';
import ToolBaseClass, { ToolOptions } from '../Tool';

export default abstract class AnnotationToolBase<
  T extends ToolOptions = ToolOptions
> extends ToolBaseClass<T> {
  protected abstract focusedAnnotation?: Annotation;
  protected usePointerLockAPI: boolean = false;

  protected abstract createAnnotation(ev: ViewerEvent): Annotation | undefined;
  protected abstract updateAnnotation(ev: ViewerEvent): void;
  protected abstract concreteAnnotation(ev: ViewerEvent): void;
  protected abstract validateAnnotation(): boolean;

  protected abstract isValidViewState(
    state: ViewState | undefined
  ): state is any;

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
    super.dragStartHandler(ev);
    const comp = ev.viewer.getComposition();
    if (!comp) return;
    const viewState = ev.viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    const antn = this.createAnnotation(ev);
    if (!antn) return;
    comp.addAnnotation(antn);
    this.focusedAnnotation = antn;
    comp.annotationUpdated();
  }

  public dragHandler(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const viewState = ev.viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    if (!this.focusedAnnotation) return;
    this.updateAnnotation(ev);

    comp.annotationUpdated();

    ev.stopPropagation();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    document.exitPointerLock();

    const comp = ev.viewer.getComposition();
    if (!comp) return;

    const viewState = ev.viewer.getState();
    if (!this.isValidViewState(viewState)) return;

    const antn = this.focusedAnnotation;
    if (!antn) return;

    if (this.validateAnnotation()) {
      this.concreteAnnotation(ev);
    } else {
      comp.removeAnnotation(antn);
    }

    this.focusedAnnotation = undefined;

    comp.annotationUpdated();

    ev.stopPropagation();
  }
}
