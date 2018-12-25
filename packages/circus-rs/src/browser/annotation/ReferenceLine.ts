import Annotation, { DrawOption } from './Annotation';
import Viewer from '../viewer/Viewer';
import ViewState, { MprViewState } from '../ViewState';
import {
  convertVolumeCoordinateToScreenCoordinate,
  convertScreenCoordinateToVolumeCoordinate
} from '../section-util';
import { intersectionOfTwoSections, Section } from '../../common/geometry';
import { Vector2, Vector3 } from 'three';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import ViewerEvent from '../viewer/ViewerEvent';

const handleSize = 5;
type HandleType = 'move';

interface Line2 {
  start: Vector2;
  end: Vector2;
}

interface Options {
  color?: string;
}
/**
 * ReferenceLine is a type of annotation which draws how the sections
 * of other viewers which share the same composition intersect with this viewer.
 */
export default class ReferenceLine implements Annotation, ViewerEventTarget {
  private targetViewer: Viewer;

  /**
   * Color of the reference line.
   */
  public color: string;

  private handleType: HandleType | undefined = undefined;
  private dragStartPoint3: Vector3 | undefined = undefined;

  public constructor(viewer: Viewer, { color = '#ff00ff' }: Options = {}) {
    this.targetViewer = viewer;
    this.color = color;

    viewer.on('statechange', (prevState, state) => {
      const comp = viewer.getComposition();
      if (comp)
        comp.viewers.forEach(v => v !== viewer && v.renderAnnotations());
    });
  }

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (viewer === this.targetViewer) return;

    const targetState = this.targetViewer.getState();
    if (viewState.type !== 'mpr' || targetState.type !== 'mpr') return;

    const section = viewState.section;
    const targetSection = targetState.section;
    const resolution = new Vector2().fromArray(viewer.getResolution());
    const line = this.getReferenceLineOnScreen(
      section,
      targetSection,
      resolution
    );
    if (!line) return;

    const canvas = viewer.canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      ctx.save();
      ctx.beginPath();
      if (option.hover) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
      } else {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
      }
      const { start, end } = line;
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.closePath();
    } finally {
      ctx.restore();
    }
  }

  private getReferenceLineOnScreen(
    section1: Section,
    section2: Section,
    resolution: Vector2
  ): Line2 | undefined {
    const refLine = intersectionOfTwoSections(section1, section2);
    if (!refLine) return;

    const start = convertVolumeCoordinateToScreenCoordinate(
      section1,
      resolution,
      refLine.start
    );
    const end = convertVolumeCoordinateToScreenCoordinate(
      section1,
      resolution,
      refLine.end
    );

    return { start, end };
  }

  /**
   * ViewerEventHandler
   */
  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;

    if (viewer === this.targetViewer) return;
    const viewState = viewer.getState();

    const targetState = this.targetViewer.getState();
    if (viewState.type !== 'mpr' || targetState.type !== 'mpr') return;

    const section1 = viewState.section;
    const section2 = targetState.section;
    const resolution = new Vector2().fromArray(viewer.getResolution());
    const line = this.getReferenceLineOnScreen(section1, section2, resolution);
    if (!line) return;

    const point = new Vector2(ev.viewerX!, ev.viewerY!);

    const handleType = this.lineHitTest(line, point);
    if (handleType) {
      this.handleType = handleType;
      viewer.setHoveringAnnotation(this);
      viewer.setCursorStyle('move');
      viewer.renderAnnotations();
    } else if (viewer.getHoveringAnnotation() === this) {
      viewer.setHoveringAnnotation(undefined);
      viewer.setCursorStyle('');
      viewer.renderAnnotations();
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();

      const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
      const state = viewer.getState() as MprViewState;
      const resolution: [number, number] = viewer.getResolution();

      this.dragStartPoint3 = convertScreenCoordinateToVolumeCoordinate(
        state.section,
        new Vector2().fromArray(resolution),
        new Vector2().fromArray([point.x, point.y])
      );
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();

      const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
      const state = viewer.getState() as MprViewState;
      const resolution: [number, number] = viewer.getResolution();

      const draggedPoint3 = convertScreenCoordinateToVolumeCoordinate(
        state.section,
        new Vector2().fromArray(resolution),
        point
      );
      const dist = draggedPoint3.clone().sub(this.dragStartPoint3!);
      const targetState = this.targetViewer.getState() as MprViewState;
      const targetSection = targetState.section;

      /**
       * Move
       */
      if (this.handleType === 'move') {
        const cross = new Vector3()
          .crossVectors(
            new Vector3().fromArray(targetSection.xAxis),
            new Vector3().fromArray(targetSection.yAxis)
          )
          .normalize();

        const movedOrigin = new Vector3()
          .fromArray(targetSection.origin)
          .add(cross.multiplyScalar(dist.dot(cross)))
          .toArray();

        this.targetViewer.setState({
          ...targetState,
          section: {
            ...targetState.section,
            origin: movedOrigin
          }
        });
      }

      this.dragStartPoint3 = draggedPoint3;
    }
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();
      this.dragStartPoint3 = undefined;
    }
  }

  private lineHitTest(line: Line2, point: Vector2): HandleType | undefined {
    const { start, end } = line;

    const delta = new Vector2(end.x - start.x, end.y - start.y);
    const nu = delta.clone().normalize();
    const nv = new Vector2(delta.y, delta.x * -1).normalize();

    const o = start.clone().add(nv.clone().multiplyScalar(-handleSize));
    const p = point.clone().sub(o);
    const pu = p.dot(nu);
    const pv = p.dot(nv);

    return pu >= 0 && pv >= 0 && pu <= delta.length() && pv <= handleSize * 2
      ? 'move'
      : undefined;
  }
}
