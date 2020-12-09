import { Box3, Line3, Vector2, Vector3 } from 'three';
import {
  distanceFromPointToSection,
  Section,
  Vector2D,
  Vector3D
} from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  convertScreenCoordinateToVolumeCoordinate,
  convertVolumeCoordinateToScreenCoordinate,
  detectOrthogonalSection
} from '../section-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import { drawFillText, drawLine, drawPoint } from './helper/drawObject';
import { FontStyle } from './helper/fontStyle';
import {
  getHandleTypeForLine,
  HandleTypeForLine
} from './helper/getHandleType';
import resize from './helper/resize';

type HandleTypeForRuler = HandleTypeForLine | 'label-move';
const cursorTypes: {
  [key in HandleTypeForRuler]: { cursor: string };
} = {
  'start-reset': { cursor: 'crosshair' },
  'end-reset': { cursor: 'crosshair' },
  'line-move': { cursor: 'move' },
  'label-move': { cursor: 'move' }
};

const defaultLabelPosition: Vector2D = [5, -5];

export default class Ruler implements Annotation, ViewerEventTarget {
  /**
   * Color of the outline.
   */
  public color: string = '#ff8800';
  public width: number = 3;
  public radius: number = 3;

  public section?: Section;

  /**
   * Coordinate of the start point, measured in mm.
   */
  public start?: Vector3D;

  /**
   * Coordinate of the end point, measured in mm.
   */
  public end?: Vector3D;

  /**
   * Radius of the marker circle .
   */
  public labelPosition: Vector2D = defaultLabelPosition;

  /**
   * The marker cirlce will be drawn when the distance between the point
   * and the section is smaller than this value.
   */
  public distanceThreshold: number = 0.1;
  public dimmedColor: string = '#ff880055';
  public distanceDimmedThreshold: number = 3;
  public labelFontStyle: FontStyle = { fontSize: '16px', color: this.color };
  public editable: boolean = true;
  public id?: string;

  private handleType: HandleTypeForRuler | undefined = undefined;
  private dragInfo:
    | {
        originalLine3: Line3;
        dragStartVolumePoint3: Vector3;
        originalLabelPosition: Vector2;
        dragStartScreenPoint2: Vector2;
      }
    | undefined;

  private drawnLine3: (() => Line3) | undefined;

  private textBoundaryHitTest:
    | ((p: Vector2) => boolean)
    | undefined = undefined;

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    this.drawnLine3 = undefined;
    if (!viewer || !viewState) return;
    if (!this.start || !this.end) return;
    const canvas = viewer.canvas;
    if (!canvas) return;
    if (viewState.type !== 'mpr') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = (() => {
      const distanceStart = distanceFromPointToSection(
        viewState.section,
        new Vector3(...this.start)
      );
      const distanceEnd = distanceFromPointToSection(
        viewState.section,
        new Vector3(...this.end)
      );
      if (distanceStart > this.distanceDimmedThreshold) return;
      if (distanceEnd > this.distanceDimmedThreshold) return;
      return distanceStart > this.distanceThreshold ||
        distanceEnd > this.distanceThreshold
        ? this.dimmedColor
        : this.color;
    })();
    if (!color) return;

    const resolution = new Vector2().fromArray(viewer.getResolution());
    const section = viewState.section;
    const p3to2 = (p: Vector3) =>
      convertVolumeCoordinateToScreenCoordinate(section, resolution, p);

    const line = new Line3(
      new Vector3(...this.start),
      new Vector3(...this.end)
    );

    const distance = Math.round(line.distance() * 10) / 10;
    const label = distance + 'mm';

    const pointStyle = { color, radius: this.radius };
    const lineStyle = {
      lineWidth: this.width,
      strokeStyle: color
    };

    const start = p3to2(line.start);
    const end = p3to2(line.end);
    const labelOrigin = start.clone().add(new Vector2(...this.labelPosition));

    drawPoint(ctx, start, pointStyle);
    drawPoint(ctx, end, pointStyle);
    drawLine(ctx, { from: start, to: end }, lineStyle);
    const { textBoundaryHitTest } = drawFillText(
      ctx,
      label,
      labelOrigin,
      this.labelFontStyle
    );
    this.textBoundaryHitTest = textBoundaryHitTest;

    this.drawnLine3 = () =>
      new Line3(
        convertScreenCoordinateToVolumeCoordinate(section, resolution, start),
        convertScreenCoordinateToVolumeCoordinate(section, resolution, end)
      );
  }

  public validate(): boolean {
    const section = this.section;
    const start = this.start;
    const end = this.end;
    if (!section || !start || !end) return false;
    return true;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;

    const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);

    this.handleType = this.getHandleType(viewer, point);
    const handleType = this.handleType;
    if (handleType) {
      ev.stopPropagation();
      viewer.setCursorStyle(cursorTypes[handleType].cursor);
      viewer.setHoveringAnnotation(this);
      viewer.renderAnnotations();
    } else if (viewer.getHoveringAnnotation() === this) {
      viewer.setHoveringAnnotation(undefined);
      viewer.setCursorStyle('');
      viewer.renderAnnotations();
    }
  }

  public dragStartHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;
    if (!this.start || !this.end || !this.section) return;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();

      const resolution = new Vector2().fromArray(viewer.getResolution());
      const state = viewer.getState() as MprViewState;
      const section = state.section;

      const dragStartScreenPoint2 = new Vector2(ev.viewerX!, ev.viewerY!);
      const dragStartVolumePoint3 = convertScreenCoordinateToVolumeCoordinate(
        section,
        resolution,
        dragStartScreenPoint2
      );

      const handleType = this.handleType;

      const originalLine3 = new Line3(
        new Vector3(...this.start),
        new Vector3(...this.end)
      );

      if (handleType === 'start-reset' || handleType === 'end-reset') {
        if (!this.drawnLine3) return;
        const drawnLine3 = this.drawnLine3();
        if (!originalLine3.equals(drawnLine3)) {
          const [start, end] = (() =>
            handleType === 'start-reset'
              ? [dragStartVolumePoint3, drawnLine3.end]
              : [drawnLine3.start, dragStartVolumePoint3])();
          this.section = section;
          this.start = start.toArray() as Vector3D;
          this.end = end.toArray() as Vector3D;
          originalLine3.start = start;
          originalLine3.end = end;
        }
      }

      const originalLabelPosition = new Vector2(...this.labelPosition);
      this.dragInfo = {
        originalLine3,
        dragStartVolumePoint3,
        dragStartScreenPoint2,
        originalLabelPosition
      };
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.dragInfo) return;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();
      const draggedPoint = new Vector2().fromArray([ev.viewerX!, ev.viewerY!]);
      const viewState = viewer.getState() as MprViewState;
      const resolution = new Vector2().fromArray(viewer.getResolution());
      const orientation = detectOrthogonalSection(viewState.section);
      const draggedPoint3 = convertScreenCoordinateToVolumeCoordinate(
        viewState.section,
        resolution,
        draggedPoint
      );
      const delta = draggedPoint3.sub(this.dragInfo.dragStartVolumePoint3);

      const handleType = this.handleType;
      if (!this.handleType) return;
      const originalLine3 = this.dragInfo.originalLine3;

      const translatePoint = (p: Vector3) =>
        [
          ...resize('move', orientation, [p.toArray(), p.toArray()], delta)[0]
        ] as Vector3D;

      switch (handleType) {
        case 'start-reset':
          this.start = translatePoint(originalLine3.start);
          break;
        case 'end-reset':
          this.end = translatePoint(originalLine3.end);
          break;
        case 'line-move':
          this.start = translatePoint(originalLine3.start);
          this.end = translatePoint(originalLine3.end);
          break;
        case 'label-move':
          {
            const delta = draggedPoint.sub(this.dragInfo.dragStartScreenPoint2);
            const newPosition = new Vector2().addVectors(
              this.dragInfo.originalLabelPosition,
              delta
            );
            this.labelPosition = [newPosition.x, newPosition.y];
          }
          break;
        default:
          break;
      }

      const comp = viewer.getComposition();
      if (!comp) return;
      comp.dispatchAnnotationChanging(this);
      comp.annotationUpdated();
    }
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();
      viewer.setCursorStyle('');

      const comp = viewer.getComposition();
      if (!comp) return;
      if (this.validate()) {
        comp.dispatchAnnotationChange(this);
        comp.annotationUpdated();
      } else {
        comp.removeAnnotation(this);
      }
      this.dragInfo = undefined;
    }
  }

  private getHandleType(
    viewer: Viewer,
    point: Vector2
  ): HandleTypeForRuler | undefined {
    const origin = this.start;
    const end = this.end;
    if (!origin || !end) return;
    const handleType: HandleTypeForRuler | undefined = getHandleTypeForLine(
      viewer,
      point,
      new Line3(new Vector3(...origin), new Vector3(...end))
    );
    if (handleType) return handleType;
    if (!this.textBoundaryHitTest) return;
    if (this.textBoundaryHitTest(point)) return 'label-move';
    return;
  }

  public static getOutline(data: {
    start: Vector3D | number[];
    end: Vector3D | number[];
  }): { min: Vector3D; max: Vector3D } {
    const box = new Box3()
      .expandByPoint(new Vector3(...data.start))
      .expandByPoint(new Vector3(...data.end));
    return {
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z]
    };
  }

  public static calculateDefaultRuler(
    viewer: Viewer
  ): {
    section: Section;
    start: Vector3D;
    end: Vector3D;
  } {
    const ratio = 0.25;
    const section = viewer.getState().section;

    const resolution = new Vector2().fromArray(viewer.getResolution());

    const halfLength = Math.min(resolution.x, resolution.y) * ratio * 0.5;

    const screenCenter = new Vector2().fromArray([
      resolution.x * 0.5,
      resolution.y * 0.5
    ]);

    const start = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2().fromArray([
        screenCenter.x - halfLength,
        screenCenter.y - halfLength
      ])
    );

    const end = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2().fromArray([
        screenCenter.x + halfLength,
        screenCenter.y + halfLength
      ])
    );

    return {
      section,
      start: [start.x, start.y, start.z],
      end: [end.x, end.y, end.z]
    };
  }
}
