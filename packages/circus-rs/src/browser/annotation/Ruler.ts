import { Box2, Line3, Vector2, Vector3 } from 'three';
import {
  distanceFromPointToSection,
  Section,
  Vector2D,
  Vector3D
} from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  getOrthogonalProjectedPoint,
  sectionFrom2dViewState
} from '../section-util';
import {
  convertViewerPointToVolumePoint,
  convertVolumePointToViewerPoint
} from '../tool/tool-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState, TwoDimensionalViewState } from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import { drawFillText, drawLine, drawPoint } from './helper/drawObject';
import { hitLineSegment, hitRectangle } from './helper/hit-test';

type RulerHitType = 'start-reset' | 'end-reset' | 'line-move' | 'label-move';

const cursorTypes: {
  [key in RulerHitType]: { cursor: string };
} = {
  'start-reset': { cursor: 'crosshair' },
  'end-reset': { cursor: 'crosshair' },
  'line-move': { cursor: 'move' },
  'label-move': { cursor: 'move' }
};

const isValidViewState = (
  viewState: ViewState | undefined
): viewState is MprViewState | TwoDimensionalViewState => {
  if (!viewState) return false;
  if (viewState.type === 'mpr') return true;
  if (viewState.type === '2d') return true;
  return false;
};
export default class Ruler implements Annotation, ViewerEventTarget {
  /**
   * Color of the outline.
   */
  public color: string = '#ff8800';

  /**
   * Width of the line that connects each end.
   */
  public width: number = 3;

  /**
   * Radius of the each end circle.
   */
  public radius: number = 3;

  /**
   * Section for retrieving the view same as when edited one.
   */
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
   * Color of the label text.
   */
  public labelColor: string = '#ff8800';

  /**
   * Font of the label text.
   * Specify the CSS font value used as the CanvasRenderingContext2D.font.
   */
  public labelFont: string = '16px sans-serif';

  /**
   * Position of the label text.
   * Specify the relative position from the start point rendered in viewer.
   * The left-top corner of the text bounding box comes to this position.
   */
  public labelPosition?: Vector2D = [0, 10];

  /**
   * The marker cirlce will be drawn when the distance between the point
   * and the section is smaller than this value.
   */
  public distanceThreshold: number = 0.1;
  public dimmedColor: string = '#ff880055';
  public distanceDimmedThreshold: number = 3;
  public editable: boolean = true;
  public id?: string;

  private textBoundingBox: Box2 | undefined = undefined;
  private handleType: RulerHitType | undefined = undefined;
  private dragInfo:
    | {
        dragStartPoint3: Vector3;
        originalStart: Vector3D;
        originalEnd: Vector3D;
        labelPositionFromCursor: Vector2;
      }
    | undefined = undefined;

  public draw(
    viewer: Viewer,
    viewState: ViewState | undefined,
    option: DrawOption
  ): void {
    if (!viewer || !isValidViewState(viewState)) return;
    const ctx = viewer.canvas?.getContext('2d');
    if (!ctx) return;

    if (!this.validate()) return;

    const color = this.determineDrawingColorFromViewState(viewState);
    if (!color) return;

    // Points on screen for each end
    const start = convertVolumePointToViewerPoint(
      viewer,
      ...this.start!,
      viewState
    );
    const end = convertVolumePointToViewerPoint(
      viewer,
      ...this.end!,
      viewState
    );

    // Draw the line connects start point to end point.
    const lineStyle = {
      lineWidth: this.width,
      strokeStyle: color
    };
    drawLine(ctx, { from: start, to: end }, lineStyle);

    // Draw each end point as a filled circle.
    drawPoint(ctx, start, { radius: this.radius, color });
    drawPoint(ctx, end, { radius: this.radius, color });

    // Draw label text for distance.
    const label = this.getLengthInMillimeter() + 'mm';
    if (this.labelPosition) {
      const [px, py] = this.labelPosition;
      const position = new Vector2(start.x + px, start.y + py);
      this.textBoundingBox = drawFillText(
        ctx,
        label,
        position,
        this.labelColor,
        this.labelFont
      );
    } else {
      this.textBoundingBox = undefined;
    }
  }

  private determineDrawingColorFromViewState(
    state: ViewState
  ): string | undefined {
    if (!this.start || !this.end) return;
    switch (state.type) {
      case '2d': {
        const { imageNumber } = state;
        return this.start[2] === imageNumber && this.end[2] === imageNumber
          ? this.color
          : undefined;
      }
      case 'mpr': {
        const { section } = state;
        const distance = Math.max(
          distanceFromPointToSection(section, new Vector3(...this.start)),
          distanceFromPointToSection(section, new Vector3(...this.end))
        );
        switch (true) {
          case distance <= this.distanceThreshold:
            return this.color;
          case distance <= this.distanceDimmedThreshold:
            return this.dimmedColor;
          default:
            return;
        }
      }
      default: {
        throw new Error('Unsupported view state.');
      }
    }
  }

  /**
   * return the ruler length in millimeter
   */
  private getLengthInMillimeter(): number {
    if (!this.start || !this.end) return 0;
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
    if (!isValidViewState(viewState)) return;
    if (!this.editable) return;

    // to prevent to edit unvisible ruler.
    const color = this.determineDrawingColorFromViewState(viewState);
    if (!color) return;

    const viewerPoint = new Vector2(ev.viewerX!, ev.viewerY!);

    this.handleType = this.judgeHandleType(viewer, viewerPoint, viewState);
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
    if (viewer.getHoveringAnnotation() !== this) return;

    const viewState = viewer.getState();
    if (!isValidViewState(viewState)) return;

    if (!this.editable) return;
    if (!this.start || !this.end || !this.section) return;
    if (!this.handleType) return;

    // to prevent to edit unvisible ruler.
    const color = this.determineDrawingColorFromViewState(viewState);
    if (!color) return;

    ev.stopPropagation();

    const viewerPoint = new Vector2(ev.viewerX!, ev.viewerY!);

    const dragStartPoint3 = convertViewerPointToVolumePoint(
      viewer,
      viewerPoint.x,
      viewerPoint.y,
      viewState
    );

    const labelPosition = this.labelPosition
      ? new Vector2(this.labelPosition[0], this.labelPosition[1])
      : new Vector2(0, 0);

    const labelPositionFromCursor = new Vector2().subVectors(
      convertVolumePointToViewerPoint(viewer, ...this.start, viewState).add(
        labelPosition
      ),
      viewerPoint
    );

    this.dragInfo = {
      dragStartPoint3,
      originalStart: this.start,
      originalEnd: this.end,
      labelPositionFromCursor
    };

    if (['start-reset', 'end-reset'].some(t => t === this.handleType)) {
      const section =
        viewState.type !== '2d'
          ? viewState.section
          : sectionFrom2dViewState(viewState);

      const start = getOrthogonalProjectedPoint(
        section,
        new Vector3().fromArray(this.start)
      ).toArray() as Vector3D;

      const end = getOrthogonalProjectedPoint(
        section,
        new Vector3().fromArray(this.end)
      ).toArray() as Vector3D;

      this.start = start;
      this.end = end;
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;

    const viewState = viewer.getState();
    if (!isValidViewState(viewState)) return;

    if (!this.dragInfo) return;
    if (!this.start || !this.end || !this.section) return;
    if (!this.handleType) return;

    ev.stopPropagation();

    const dragPoint3 = convertViewerPointToVolumePoint(
      viewer,
      ev.viewerX!,
      ev.viewerY!,
      viewState
    );

    const dragDistance3 = new Vector3().subVectors(
      dragPoint3,
      this.dragInfo.dragStartPoint3
    );

    if (['start-reset', 'line-move'].some(t => t === this.handleType)) {
      this.start = [
        this.dragInfo.originalStart[0] + dragDistance3.x,
        this.dragInfo.originalStart[1] + dragDistance3.y,
        this.dragInfo.originalStart[2] + dragDistance3.z
      ];
    }

    if (['end-reset', 'line-move'].some(t => t === this.handleType)) {
      this.end = [
        this.dragInfo.originalEnd[0] + dragDistance3.x,
        this.dragInfo.originalEnd[1] + dragDistance3.y,
        this.dragInfo.originalEnd[2] + dragDistance3.z
      ];
    }

    if (['label-move'].some(t => t === this.handleType)) {
      this.labelPosition = new Vector2(
        ev.viewerX! + this.dragInfo.labelPositionFromCursor.x,
        ev.viewerY! + this.dragInfo.labelPositionFromCursor.y
      )
        .sub(convertVolumePointToViewerPoint(viewer, ...this.start, viewState))
        .toArray() as Vector2D;
    }

    const comp = viewer.getComposition();
    if (!comp) return;
    comp.dispatchAnnotationChanging(this);
    comp.annotationUpdated();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;

    ev.stopPropagation();

    this.dragInfo = undefined;
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

  private judgeHandleType(
    viewer: Viewer,
    viewerPoint: Vector2,
    viewState: ViewState
  ): RulerHitType | undefined {
    if (!this.validate()) return;

    if (
      this.textBoundingBox &&
      hitRectangle(viewerPoint, this.textBoundingBox)
    ) {
      return 'label-move';
    }

    const start = convertVolumePointToViewerPoint(
      viewer,
      ...this.start!,
      viewState
    );
    const startHitBox = new Box2(
      new Vector2(start.x - this.radius, start.y - this.radius),
      new Vector2(start.x + this.radius, start.y + this.radius)
    );
    if (hitRectangle(viewerPoint, startHitBox, 5)) {
      return 'start-reset';
    }

    const end = convertVolumePointToViewerPoint(
      viewer,
      ...this.end!,
      viewState
    );
    const endHitBox = new Box2(
      new Vector2(end.x - this.radius, end.y - this.radius),
      new Vector2(end.x + this.radius, end.y + this.radius)
    );
    if (hitRectangle(viewerPoint, endHitBox, 5)) {
      return 'end-reset';
    }

    if (hitLineSegment(viewerPoint, { start, end })) {
      return 'line-move';
    }

    return;
  }
}
