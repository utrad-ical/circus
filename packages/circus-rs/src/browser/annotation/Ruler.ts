import { Box2, Box3, Line3, Vector2, Vector3 } from 'three';
import {
  distanceFromPointToSection,
  Section,
  Vector2D,
  Vector3D
} from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  convertScreenCoordinateToVolumeCoordinate,
  detectOrthogonalSection
} from '../section-util';
import { convertVolumePointToViewerPoint } from '../tool/tool-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import { drawFillText, drawLine, drawPoint } from './helper/drawObject';
import { FontStyle } from './helper/fontStyle';
import resize from './helper/resize';

type HitType =
  | 'start-reset'
  | 'end-reset'
  | 'line-move'
  | 'label-move';

const cursorTypes: {
  [key in HitType]: { cursor: string };
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

  private textBoundingBox: Box2 | undefined = undefined;

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

  private handleType: HitType | undefined = undefined;
  private dragInfo:
    | {
        originalLine3: Line3;
        dragStartVolumePoint3: Vector3;
        originalLabelPosition: Vector2;
        dragStartScreenPoint2: Vector2;
      }
    | undefined;

  private drawnLine3: (() => Line3) | undefined;


  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    this.drawnLine3 = undefined;
    if (!viewer || !viewState || viewState.type !== 'mpr') return;
    const ctx = viewer.canvas?.getContext('2d');
    if (!ctx) return;

    if (!this.validate()) return;

    const resolution = new Vector2().fromArray(viewer.getResolution());
    const section = viewState.section;

    const color = this.getStrokeColor(section);
    if (!color) return;

    // Draw points, start, end
    const start = convertVolumePointToViewerPoint(
      viewer,
      this.start![0],
      this.start![1],
      this.start![2]
    );
    const end = convertVolumePointToViewerPoint(
      viewer,
      this.end![0],
      this.end![1],
      this.end![2]
    );
    const pointStyle = { color, radius: this.radius };
    drawPoint(ctx, start, pointStyle);
    drawPoint(ctx, end, pointStyle);

    // Draw the line connects start to end.
    const lineStyle = {
      lineWidth: this.width,
      strokeStyle: color
    };
    drawLine(ctx, { from: start, to: end }, lineStyle);

    // Draw label for distance.
    const label = this.getDistance()! + 'mm';
    const [px, py] = this.labelPosition;
    const position = new Vector2(start.x + px, start.y + py);
    this.textBoundingBox = drawFillText(
      ctx,
      label,
      position,
      this.labelFontStyle
    );

    this.drawnLine3 = () =>
      new Line3(
        convertScreenCoordinateToVolumeCoordinate(section, resolution, start),
        convertScreenCoordinateToVolumeCoordinate(section, resolution, end)
      );
  }

  private getStrokeColor(section: Section): string | undefined {
    const maxDistance = Math.max(
      distanceFromPointToSection(section, new Vector3(...this.start!)),
      distanceFromPointToSection(section, new Vector3(...this.end!))
    );

    switch (true) {
      case maxDistance <= this.distanceThreshold:
        return this.color;
      case maxDistance <= this.distanceDimmedThreshold:
        return this.dimmedColor;
      default:
        return;
    }
  }

  /**
   * return the ruler length in millimeter
   */
  private getDistance(): number | undefined {
    if (!this.validate()) return;
    const line = new Line3(
      new Vector3(...this.start!),
      new Vector3(...this.end!)
    );
    return Math.round(line.distance() * 10) / 10;
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

    this.handleType = this.hitTest(ev);
    if (this.handleType) {
      ev.stopPropagation();
      viewer.setCursorStyle(cursorTypes[this.handleType].cursor);
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

  private hitTest(ev: ViewerEvent): HitType | undefined {
    if (!this.validate()) return;

    const viewer = ev.viewer;
    const point = new Vector2(ev.viewerX!, ev.viewerY!);

    if (hitRectangle(point, this.textBoundingBox!)) {
      return 'label-move';
    }

    const start = convertVolumePointToViewerPoint(
      viewer,
      this.start![0],
      this.start![1],
      this.start![2]
    );
    const startHitBox = new Box2(
      new Vector2(start.x - this.radius, start.y - this.radius),
      new Vector2(start.x + this.radius, start.y + this.radius)
    );
    if (hitRectangle(point, startHitBox, 5)) {
      return 'start-reset';
    }

    const end = convertVolumePointToViewerPoint(
      viewer,
      this.end![0],
      this.end![1],
      this.end![2]
    );
    const endHitBox = new Box2(
      new Vector2(end.x - this.radius, end.y - this.radius),
      new Vector2(end.x + this.radius, end.y + this.radius)
    );
    if (hitRectangle(point, endHitBox, 5)) {
      return 'end-reset';
    }

    if (hitLineSegment(point, { start, end })) {
      return 'line-move';
    }

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

type LineSegment = { start: Vector2; end: Vector2 };
function hitLineSegment(
  point: Vector2,
  { start, end }: LineSegment,
  margin: number = 5
) {
  const lv = new Vector2(end.x - start.x, end.y - start.y);
  const nu = lv.clone().normalize();
  const nv = new Vector2(lv.y, lv.x * -1).normalize();

  const pv = point.clone().sub(start);
  const uDot = pv.dot(nu);
  const vDot = pv.dot(nv);

  const uDotMin = -margin;
  const uDotMax = lv.length() + margin;
  const vDotMin = -margin;
  const vDotMax = margin;

  return (
    uDotMin <= uDot && uDot <= uDotMax && vDotMin <= vDot && vDot <= vDotMax
  );
}
function hitRectangle(point: Vector2, rect: Box2, margin: number = 0) {
  return new Box2(
    rect.min.clone().subScalar(margin),
    rect.max.clone().addScalar(margin)
  ).containsPoint(point);
}
