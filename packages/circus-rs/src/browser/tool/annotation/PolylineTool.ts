import { Vector2D } from '../../../common/geometry';
import { Annotation } from '../..';
import Polyline from '../../annotation/Polyline';
import Composition from '../../Composition';
import { detectOrthogonalSection } from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import ToolBaseClass, { ToolOptions } from '../Tool';
import { convertViewerPointToVolumePoint } from '../tool-util';

/**
 * PolylineTool
 */
export default class PolylineTool extends ToolBaseClass<ToolOptions> {
  protected focusedAnnotation?: Polyline;

  protected mode: 'open' | 'closed' = 'open';

  public activate(viewer: Viewer): void {
    this.initializeAnnotation();
    viewer.primaryEventTarget = this;
    window.addEventListener('keydown', this.keyDownHandler);
  }

  public deactivate(viewer: Viewer): void {
    this.concreteAnnotation();
    window.removeEventListener('keydown', this.keyDownHandler);
    viewer.primaryEventTarget = undefined;
  }

  public keyDownHandler = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case 'Escape':
        this.concreteAnnotation();
        break;
      default:
        // Nothing to do
        break;
    }
  };

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
    if (orientation !== 'axial') return;

    if (this.mode === 'closed') {
      this.initializeAnnotation();
    }

    if (!this.focusedAnnotation) return;
    const antn = this.creationHandler(ev, this.focusedAnnotation);
    this.annotationUpdated(comp, antn);
  }

  public dragHandler(ev: ViewerEvent): void {
    ev.stopPropagation();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    ev.stopPropagation();
  }

  public dblClickHandler(ev: ViewerEvent): void {
    if (this.focusedAnnotation && this.focusedAnnotation.points.length > 2) {
      const comp = ev.viewer.getComposition();
      if (!comp) return;
      this.focusedAnnotation.closed = true;
      this.annotationUpdated(comp, this.focusedAnnotation);
    }
    this.concreteAnnotation();
  }

  protected createAnnotation(): Polyline {
    // TODO: Check the Tool default settings
    const antn = new Polyline();
    antn.editable = true;
    return antn;
  }

  protected annotationUpdated(comp: Composition, antn: Annotation): void {
    comp.addAnnotation(antn);
    comp.annotationUpdated();
  }

  protected creationHandler(ev: ViewerEvent, antn: Polyline): Annotation {
    const evPoint = convertViewerPointToVolumePoint(
      ev.viewer,
      ev.viewerX!,
      ev.viewerY!
    );
    const point = [evPoint.x, evPoint.y] as Vector2D;
    if (!antn.z) {
      antn.z = evPoint.z;
    }

    if (antn.equalsPoint(ev, 0)) {
      antn.closed = true;
      this.concreteAnnotation();
    } else if (!antn.equalsPoint(ev, antn.points.length - 1)) {
      antn.points.push(point);
    }

    return antn;
  }

  protected initializeAnnotation(): void {
    this.mode = 'open';
    this.focusedAnnotation = this.createAnnotation();
  }

  protected concreteAnnotation(): void {
    this.mode = 'closed';
    this.focusedAnnotation = undefined;
  }
}
