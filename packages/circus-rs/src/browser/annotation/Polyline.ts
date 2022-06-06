import { Box2, Box3, Vector2, Vector3 } from 'three';
import { Vector2D, Vector3D, verticesOfBox } from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  convertVolumeCoordinateToScreenCoordinate,
  detectOrthogonalSection,
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
import drawBoundingBoxOutline from './helper/drawBoundingBoxOutline';
import drawHandleFrame from './helper/drawHandleFrame';
import { drawPath, drawPoint } from './helper/drawObject';
import handleBoundingBoxOperation from './helper/handleBoundingBoxOperation';
import {
  BoundingRectWithHandleHitType,
  hitBoundingRectWithHandles,
  hitRectangle
} from './helper/hit-test';
import ModifierKeyBehaviors from './ModifierKeyBehaviors';

const handleSize = 5;

type PolylineHitType = BoundingRectWithHandleHitType | 'point-move';

const cursorTypes: {
  [key in PolylineHitType]: { cursor: string };
} = {
  'north-west-handle': { cursor: 'nw-resize' },
  'north-handle': { cursor: 'n-resize' },
  'north-east-handle': { cursor: 'ne-resize' },
  'east-handle': { cursor: 'e-resize' },
  'south-east-handle': { cursor: 'se-resize' },
  'south-handle': { cursor: 's-resize' },
  'south-west-handle': { cursor: 'sw-resize' },
  'west-handle': { cursor: 'w-resize' },
  'rect-outline': { cursor: 'move' },
  'point-move': { cursor: 'crosshair' }
};

const isValidViewState = (
  viewState: ViewState | undefined
): viewState is MprViewState | TwoDimensionalViewState => {
  if (!viewState) return false;
  if (viewState.type === 'mpr') return true;
  if (viewState.type === '2d') return true;
  return false;
};

export default class Polyline
  implements Annotation, ViewerEventTarget, ModifierKeyBehaviors
{
  /**
   * Color of the outline.
   */
  public color: string = '#ff88ff';
  public dimmedColor: string = '#ff88ff55';

  /**
   * Color of the fill.
   */
  public fillColor: string | undefined = undefined;
  public dimmedFillColor: string | undefined = undefined;

  /**
   * Width of the line that connects each end.
   */
  public width: number = 3;

  /**
   * Coordinate of the points, measured in mm.
   */
  public points: Vector2D[] = [];

  /**
   * The Z coordinate of the outline.
   */
  public z?: number;

  /**
   * Displays the outline when z is below this threshold.
   */
  public zThreshold: number = 0.1;
  public zDimmedThreshold: number = 3;

  public editable: boolean = true;
  public closed: boolean = false;
  public fillRule: CanvasFillRule = 'evenodd';
  public id?: string;

  public lockMaintainAspectRatio: boolean = true;
  public lockFixCenterOfGravity: boolean = true;

  public boundingBoxOutline?: {
    width: number;
    color: string;
  } = {
    width: 1,
    color: 'rgba(255,255,255,0.5)'
  };

  private handleType:
    | { hitType: PolylineHitType; findHitPointIndex: number }
    | undefined = undefined;

  private dragInfo:
    | {
        dragStartVolumePoint3: Vector3D;
        originalPoints: Vector2D[];
        originalBoundingBox: [number[], number[]];
      }
    | undefined = undefined;

  public draw(
    viewer: Viewer,
    viewState: ViewState | undefined,
    option: DrawOption
  ): void {
    if (this.points.length === 0 || this.z === undefined) return;

    if (!viewer || !isValidViewState(viewState)) return;

    const canvas = viewer.canvas;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { color, fillColor } =
      this.determineDrawingColorFromViewState(viewState);
    if (!color && !fillColor) return;

    const section =
      viewState.type !== '2d'
        ? viewState.section
        : sectionFrom2dViewState(viewState);

    const resolution = new Vector2().fromArray(viewer.getResolution());
    const screenPoints = this.points.map(p =>
      convertVolumeCoordinateToScreenCoordinate(
        section,
        resolution,
        new Vector3(p[0], p[1], this.z)
      )
    );

    // Draw a polyline or point
    if (screenPoints.length > 1) {
      drawPath(ctx, screenPoints, {
        lineWidth: this.width,
        closePath: this.closed,
        strokeStyle: color,
        fillStyle: fillColor,
        fillRule: this.fillRule
      });
    } else if (screenPoints.length === 1) {
      drawPoint(ctx, screenPoints[0], {
        radius: this.width,
        color: color ?? fillColor!
      });
    }

    // Draw bounding box outline
    const drawBoundingBoxOutlineStyle = this.boundingBoxOutline;
    if (drawBoundingBoxOutlineStyle && this.points.length > 1) {
      drawBoundingBoxOutline(
        ctx,
        this.boundingBox3(),
        resolution,
        section,
        drawBoundingBoxOutlineStyle
      );
    }

    if (!this.handleType) return;

    // Draw handle frame
    if (this.points.length > 1) {
      drawHandleFrame(ctx, verticesOfBox(this.boundingBox2(viewer)), {
        handleSize,
        strokeStyle: '#ffff00'
      });
    }

    drawHandleFrame(ctx, screenPoints, {
      handleSize,
      invalidSegmentCenter: true
    });
  }

  private determineDrawingColorFromViewState(state: ViewState): {
    color?: string;
    fillColor?: string;
  } {
    if (this.z === undefined) return {};
    switch (state.type) {
      case '2d': {
        const { imageNumber } = state;
        return this.z === imageNumber
          ? { color: this.color, fillColor: this.fillColor }
          : {};
      }
      case 'mpr': {
        // Displays only when the volume is displayed as an axial slice
        const section = state.section;
        const orientation = detectOrthogonalSection(section);
        if (orientation !== 'axial') return {};
        const distance = Math.abs(this.z - section.origin[2]);
        switch (true) {
          case distance <= this.zThreshold:
            return { color: this.color, fillColor: this.fillColor };
          case distance <= this.zDimmedThreshold:
            return { color: this.dimmedColor, fillColor: this.dimmedFillColor };
          default:
            return {};
        }
      }
      default: {
        throw new Error('Unsupported view state.');
      }
    }
  }

  public validate(): boolean {
    if (this.points.length === 0 || this.z === undefined) return false;
    return true;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!isValidViewState(viewState)) return;

    if (this.z === undefined) return;
    if (!this.editable) return;

    // to prevent to edit unvisible polyline.
    const drawingColor = this.determineDrawingColorFromViewState(viewState);
    if (Object.values(drawingColor).length === 0) return;

    const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
    this.handleType = this.judgeHandleType(viewer, point);
    if (this.handleType) {
      ev.stopPropagation();
      viewer.setCursorStyle(cursorTypes[this.handleType.hitType].cursor);
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

    if (this.z === undefined) return;
    if (!this.editable) return;
    if (!this.handleType) return;

    ev.stopPropagation();

    const boundingBox3 = this.boundingBox3();
    this.dragInfo = {
      dragStartVolumePoint3: convertViewerPointToVolumePoint(
        viewer,
        ev.viewerX!,
        ev.viewerY!
      ).toArray() as Vector3D,
      originalPoints: [...this.points],
      originalBoundingBox: [
        boundingBox3.min.toArray(),
        boundingBox3.max.toArray()
      ]
    };
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;

    const viewState = viewer.getState();
    if (!isValidViewState(viewState)) return;

    if (this.z === undefined) return;
    if (!this.editable) return;
    if (!this.handleType) return;
    if (!this.dragInfo) return;

    ev.stopPropagation();

    const dragStartVolumePoint3 = new Vector3(
      ...this.dragInfo.dragStartVolumePoint3
    );
    const originalPoints = [...this.dragInfo.originalPoints];
    const originalBoundingBox = this.dragInfo.originalBoundingBox;

    const dragPoint3 = convertViewerPointToVolumePoint(
      viewer,
      ev.viewerX!,
      ev.viewerY!
    );

    const { hitType, findHitPointIndex } = this.handleType;
    if (hitType === 'point-move') {
      // Move a point
      const dragDistance = dragPoint3.clone().sub(dragStartVolumePoint3);
      const targetOriginalPoint = [...originalPoints[findHitPointIndex]];
      this.points[findHitPointIndex] = [
        targetOriginalPoint[0] + dragDistance.x,
        targetOriginalPoint[1] + dragDistance.y
      ];
    } else if (hitType as BoundingRectWithHandleHitType) {
      // Move or Resize
      const lockMaintainAspectRatio = this.lockMaintainAspectRatio
        ? !!ev.shiftKey
        : !ev.shiftKey;
      const lockFixCenterOfGravity = this.lockFixCenterOfGravity
        ? !!ev.ctrlKey
        : !ev.ctrlKey;

      const z = this.z;
      this.points = handleBoundingBoxOperation(
        originalBoundingBox,
        'axial',
        hitType,
        dragStartVolumePoint3,
        dragPoint3,
        lockMaintainAspectRatio,
        lockFixCenterOfGravity,
        originalPoints.map(p => [...p, z])
      ).map(p => [p[0], p[1]]);
    } else {
      throw new Error('Unsupported PolylineHitType');
    }

    this.annotationUpdated(viewer);
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;

    if (this.z === undefined) return;
    if (!this.editable) return;

    ev.stopPropagation();

    this.annotationUpdated(viewer);
    this.handleType = undefined;
    this.dragInfo = undefined;
  }

  protected annotationUpdated(viewer: Viewer): void {
    const comp = viewer.getComposition();
    if (!comp) return;
    if (!this.validate()) {
      if (comp) comp.removeAnnotation(this);
    }
    comp.dispatchAnnotationChanging(this);
    comp.annotationUpdated();
  }

  public hitFirstPointTest(viewer: Viewer, viewerPoint: Vector2D): boolean {
    if (this.points.length === 0) return false;

    return this.hitPointTest(viewer, new Vector2(...viewerPoint), [
      ...this.points[0]
    ]);
  }

  public hitLastPointTest(viewer: Viewer, viewerPoint: Vector2D): boolean {
    if (this.points.length === 0) return false;

    return this.hitPointTest(viewer, new Vector2(...viewerPoint), [
      ...this.points[this.points.length - 1]
    ]);
  }

  protected boundingBox3() {
    const z = this.z;
    const points = this.points;
    const box = new Box3().makeEmpty();
    points.forEach(point => box.expandByPoint(new Vector3(...point, z)));
    return box;
  }

  protected boundingBox2(viewer: Viewer) {
    const box3 = this.boundingBox3();
    const minPoint = convertVolumePointToViewerPoint(
      viewer,
      ...(box3.min.toArray() as Vector3D)
    );
    const maxPoint = convertVolumePointToViewerPoint(
      viewer,
      ...(box3.max.toArray() as Vector3D)
    );
    const box = new Box2(minPoint, maxPoint);
    return box;
  }

  protected judgeHandleType(
    viewer: Viewer,
    viewerPoint: Vector2
  ): { hitType: PolylineHitType; findHitPointIndex: number } | undefined {
    const findHitPointIndex = this.findHitPointIndex(viewer, viewerPoint);
    if (findHitPointIndex > -1) {
      return { hitType: 'point-move', findHitPointIndex };
    }

    const hitType = hitBoundingRectWithHandles(
      viewerPoint,
      this.boundingBox2(viewer),
      handleSize
    );
    return hitType
      ? {
          hitType,
          findHitPointIndex
        }
      : undefined;
  }

  protected hitPointTest(
    viewer: Viewer,
    viewerPoint: Vector2,
    polylinePoint: Vector2D
  ): boolean {
    if (this.z === undefined) return false;

    const hitPoint = convertVolumePointToViewerPoint(
      viewer,
      ...polylinePoint,
      this.z
    );

    const hitBox = new Box2(
      new Vector2(hitPoint.x - handleSize, hitPoint.y - handleSize),
      new Vector2(hitPoint.x + handleSize, hitPoint.y + handleSize)
    );

    return hitRectangle(viewerPoint, hitBox, handleSize);
  }

  protected findHitPointIndex(viewer: Viewer, viewerPoint: Vector2): number {
    if (this.z === undefined) return -1;
    const z = this.z;
    return this.points.findIndex(p =>
      this.hitPointTest(viewer, viewerPoint, [...p])
    );
  }
}
