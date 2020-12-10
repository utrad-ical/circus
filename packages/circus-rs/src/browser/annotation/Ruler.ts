import { Box2, Box3, Line3, Vector2, Vector3 } from 'three';
import {
  distanceFromPointToSection,
  normalVector,
  Section,
  Vector2D,
  Vector3D
} from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import { convertScreenCoordinateToVolumeCoordinate } from '../section-util';
import {
  convertViewerPointToVolumePoint,
  convertVolumePointToViewerPoint
} from '../tool/tool-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import { drawFillText, drawLine, drawPoint } from './helper/drawObject';
import { FontStyle } from './helper/fontStyle';

type HitType = 'start-reset' | 'end-reset' | 'line-move' | 'label-move';

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

  private dragStartPointOnScreen: Vector2 | undefined = undefined;
  private original:
    | {
        start: Vector3D;
        end: Vector3D;
        labelPosition: Vector2D;
      }
    | undefined = undefined;

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (!viewer || !viewState || viewState.type !== 'mpr') return;
    const ctx = viewer.canvas?.getContext('2d');
    if (!ctx) return;

    if (!this.validate()) return;

    const section = viewState.section;

    const color = this.getStrokeColor(section);
    if (!color) return;

    // Points on screen for each end
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

    // Draw the line connects start point to end point.
    const lineStyle = {
      lineWidth: this.width,
      strokeStyle: ['line-move'].some(t => t === this.handleType)
        ? 'red'
        : color
    };
    drawLine(ctx, { from: start, to: end }, lineStyle);

    // Draw each end point as a filled circle.
    drawPoint(ctx, start, {
      radius: this.radius,
      color: ['line-move', 'start-reset'].some(t => t === this.handleType)
        ? 'red'
        : color
    });
    drawPoint(ctx, end, {
      radius: this.radius,
      color: ['line-move', 'end-reset'].some(t => t === this.handleType)
        ? 'red'
        : color
    });

    // Draw label text for distance.
    const label = this.getDistance()! + 'mm';
    const [px, py] = this.labelPosition;
    const position = new Vector2(start.x + px, start.y + py);
    this.textBoundingBox = drawFillText(ctx, label, position, {
      ...this.labelFontStyle,
      color: ['line-move', 'label-move'].some(t => t === this.handleType)
        ? 'red'
        : this.labelFontStyle.color
    });
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
    if (!this.start || !this.end) return;
    const line = new Line3(
      new Vector3(...this.start),
      new Vector3(...this.end)
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

      this.dragStartPointOnScreen = new Vector2(ev.viewerX!, ev.viewerY!);
      this.original = {
        start: this.start,
        end: this.end,
        labelPosition: this.labelPosition
      };

      if (['start-reset', 'end-reset'].some(t => t === this.handleType)) {
        const { section } = viewer.getState() as MprViewState;
        const start = new Vector3().fromArray(this.start!);
        const end = new Vector3().fromArray(this.end!);
        this.start = getOrthogonalProjectedPoint(
          section,
          start
        ).toArray() as Vector3D;
        this.end = getOrthogonalProjectedPoint(
          section,
          end
        ).toArray() as Vector3D;
      }
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.dragStartPointOnScreen || !this.original) return;
    if (viewer.getHoveringAnnotation() !== this) return;

    ev.stopPropagation();

    const draggedTotal = new Vector2(
      ev.viewerX! - this.dragStartPointOnScreen!.x,
      ev.viewerY! - this.dragStartPointOnScreen!.y
    );

    if (['start-reset', 'line-move'].some(t => t === this.handleType)) {
      const originalStartOnScreen = convertVolumePointToViewerPoint(
        ev.viewer,
        this.original.start[0],
        this.original.start[1],
        this.original.start[2]
      );
      this.start = convertViewerPointToVolumePoint(
        ev.viewer,
        originalStartOnScreen.x + draggedTotal.x,
        originalStartOnScreen.y + draggedTotal.y
      ).toArray() as Vector3D;
    }

    if (['end-reset', 'line-move'].some(t => t === this.handleType)) {
      const originalEndOnScreen = convertVolumePointToViewerPoint(
        ev.viewer,
        this.original.end[0],
        this.original.end[1],
        this.original.end[2]
      );
      this.end = convertViewerPointToVolumePoint(
        ev.viewer,
        originalEndOnScreen.x + draggedTotal.x,
        originalEndOnScreen.y + draggedTotal.y
      ).toArray() as Vector3D;
    }

    if (['label-move'].some(t => t === this.handleType)) {
      const originalLabelPosition = this.original.labelPosition;
      this.labelPosition = [
        originalLabelPosition[0] + draggedTotal.x,
        originalLabelPosition[1] + draggedTotal.y
      ];
    }

    const comp = viewer.getComposition();
    if (!comp) return;
    comp.dispatchAnnotationChanging(this);
    comp.annotationUpdated();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();
      this.dragStartPointOnScreen = undefined;
      this.original = undefined;

      viewer.setCursorStyle('');

      const comp = viewer.getComposition();
      if (!comp) return;
      if (this.validate()) {
        comp.dispatchAnnotationChange(this);
        comp.annotationUpdated();
      } else {
        comp.removeAnnotation(this);
      }
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
  if (start.equals(end)) return false;

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

function getOrthogonalProjectedPoint(section: Section, point: Vector3) {
  const normal = normalVector(section);
  const p = new Vector3().subVectors(
    point,
    new Vector3().fromArray(section.origin)
  );
  const zDist = normal.dot(p);

  return zDist !== 0
    ? point.sub(normal.clone().multiplyScalar(zDist))
    : point.clone();
}
