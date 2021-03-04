import { Vector2D } from 'circus-rs/src/common/geometry';
import { Annotation } from '../..';
import Polyline from '../../annotation/Polyline';
import Composition from '../../Composition';
import { detectOrthogonalSection } from '../../section-util';
import Viewer from '../../viewer/Viewer';
import ViewerEvent from '../../viewer/ViewerEvent';
import ToolBaseClass, { ToolOptions } from '../Tool';
import { convertViewerPointToVolumePoint } from '../tool-util';

type PolylineToolMode = 'readOnly' | 'creation' | 'deformation';

/**
 * PolylineTool creates and edits Polyline.
 */
export default class PolylineTool extends ToolBaseClass<ToolOptions> {
  protected focusedAnnotation?: Polyline;

  protected mode: PolylineToolMode = 'creation';

  public activate(viewer: Viewer): void {
    this.mode = 'creation';
    this.focusedAnnotation = this.createAnnotation();
    viewer.primaryEventTarget = this;
    window.addEventListener('keydown', this.keyDownHandler);
  }

  public deactivate(viewer: Viewer): void {
    this.focusedAnnotation = undefined;
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
    switch (this.mode) {
      case 'readOnly':
        // ignore
        return;
      case 'creation':
        ev.stopPropagation();
        break;
      case 'deformation':
        // TODO:doramari
        break;
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    const comp = ev.viewer.getComposition();
    if (!comp) return;
    const viewState = ev.viewer.getState();
    if (!viewState || viewState.type !== 'mpr') return;
    const section = viewState.section;
    const orientation = detectOrthogonalSection(section);
    if (orientation !== 'axial') return;
    if (!this.focusedAnnotation) return;

    switch (this.mode) {
      case 'readOnly':
        return;
      case 'creation':
        const antn = this.creationHandler(ev, this.focusedAnnotation);
        this.annotationUpdated(comp, antn);
        break;
      case 'deformation':
        // TODO:doramari
        break;
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    // TODO:doramari
  }

  public dragEndHandler(ev: ViewerEvent): void {
    // TODO:doramari
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
    // antn.fillMode = 'nonzero';
    // antn.boundingBoxOutline = undefined;
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

  protected concreteAnnotation(): void {
    this.mode = 'readOnly';
  }

  protected validateAnnotation(): boolean {
    if (!this.focusedAnnotation) return false;
    return this.focusedAnnotation.validate();
  }
}
