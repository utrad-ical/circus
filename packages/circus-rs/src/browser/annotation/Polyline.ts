import { Box2, Box3, Vector2, Vector3 } from 'three';
import {
  Section,
  Vector2D,
  Vector3D,
  verticesOfBox
} from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  convertScreenCoordinateToVolumeCoordinate,
  convertVolumeCoordinateToScreenCoordinate,
  detectOrthogonalSection
} from '../section-util';
import {
  convertViewerPointToVolumePoint,
  convertVolumePointToViewerPoint
} from '../tool/tool-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import ModifierKeyBehaviors from './ModifierKeyBehaviors';
import drawBoundingBoxOutline from './helper/drawBoundingBoxOutline';
import drawHandleFrame from './helper/drawHandleFrame';
import { drawPath, drawPoint } from './helper/drawObject';
import handleBoundingBoxOperation from './helper/handleBoundingBoxOperation';
import {
  BoundingRectWithHandleHitType,
  hitBoundingRectWithHandles,
  hitRectangle
} from './helper/hit-test';

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
        originalBoundingBox: [number[], number[]] | undefined;
      }
    | undefined = undefined;

  private getDrawingColor(section: Section): {
    color?: string;
    fillColor?: string;
  } {
    // Displays only when the volume is displayed as an axial slice
    const orientation = detectOrthogonalSection(section);
    if (orientation !== 'axial') return {};

    if (!this.z) return {};

    const zDiff = Math.abs(this.z - section.origin[2]);
    if (zDiff > this.zDimmedThreshold) return {};

    return zDiff > this.zThreshold
      ? { color: this.dimmedColor, fillColor: this.dimmedFillColor }
      : { color: this.color, fillColor: this.fillColor };
  }

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (this.points.length === 0 || !this.z) return;

    if (!viewer || !viewState) return;
    const canvas = viewer.canvas;
    if (!canvas) return;
    if (viewState.type !== 'mpr') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { color, fillColor } = this.getDrawingColor(viewState.section);
    if (!color && !fillColor) return;

    const resolution = new Vector2().fromArray(viewer.getResolution());
    const screenPoints = this.points.map(p =>
      convertVolumeCoordinateToScreenCoordinate(
        viewState.section,
        resolution,
        new Vector3(p[0], p[1], this.z ? this.z : 0)
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
        viewState.section,
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

  public validate(): boolean {
    if (this.points.length === 0 || !this.z) return false;
    return true;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;

    // to prevent to edit unvisible polyline.
    const drawingColor = this.getDrawingColor(viewState.section);
    if (Object.values(drawingColor).length === 0) return;

    this.handleType = this.hitTest(ev);
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
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;

    if (viewer.getHoveringAnnotation() !== this) return;
    ev.stopPropagation();

    this.handleType = this.hitTest(ev);
    if (!this.handleType) return;

    const originalBoundingBox = this.boundingBox3();

    this.dragInfo = {
      dragStartVolumePoint3: convertViewerPointToVolumePoint(
        viewer,
        ev.viewerX!,
        ev.viewerY!
      ).toArray() as Vector3D,
      originalPoints: [...this.points],
      originalBoundingBox: [
        originalBoundingBox.min.toArray(),
        originalBoundingBox.max.toArray()
      ]
    };
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.dragInfo) return;

    if (viewer.getHoveringAnnotation() !== this) return;
    ev.stopPropagation();

    const evPoint: [number, number] = [ev.viewerX!, ev.viewerY!];

    const resolution: [number, number] = viewer.getResolution();

    const { dragStartVolumePoint3, originalPoints, originalBoundingBox } =
      this.dragInfo;

    const dragStartPoint3 = new Vector3(...dragStartVolumePoint3);
    const draggedPoint3 = convertScreenCoordinateToVolumeCoordinate(
      viewState.section,
      new Vector2().fromArray(resolution),
      new Vector2().fromArray(evPoint)
    );

    const draggedTotal3 = new Vector3().subVectors(
      draggedPoint3,
      dragStartPoint3
    );

    if (!this.handleType) return;
    const { hitType, findHitPointIndex } = this.handleType;
    if (hitType === 'point-move') {
      // Move a point
      const targetOriginalPoint = [...originalPoints[findHitPointIndex]];
      this.points[findHitPointIndex] = [
        targetOriginalPoint[0] + draggedTotal3.x,
        targetOriginalPoint[1] + draggedTotal3.y
      ];
    } else if (hitType as BoundingRectWithHandleHitType) {
      // Move or Resize
      const targetOriginalPoints = [...originalPoints];

      const lockMaintainAspectRatio = this.lockMaintainAspectRatio
        ? !!ev.shiftKey
        : !ev.shiftKey;
      const lockFixCenterOfGravity = this.lockFixCenterOfGravity
        ? !!ev.ctrlKey
        : !ev.ctrlKey;

      this.points = handleBoundingBoxOperation(
        originalBoundingBox!,
        'axial',
        hitType,
        dragStartPoint3,
        draggedPoint3,
        lockMaintainAspectRatio,
        lockFixCenterOfGravity,
        targetOriginalPoints.map(targetOriginalPoint => [
          ...targetOriginalPoint,
          this.z!
        ])
      ).map(p => [p[0], p[1]]);
    } else {
      throw new Error('Unsupported PolylineHitType');
    }

    this.annotationUpdated(viewer);
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;
    if (viewer.getHoveringAnnotation() !== this) return;

    ev.stopPropagation();

    this.annotationUpdated(viewer);
    this.handleType = undefined;
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

  public equalsPoint(ev: ViewerEvent, targetPointIndex: number): boolean {
    if (
      !this.z ||
      targetPointIndex < 0 ||
      targetPointIndex >= this.points.length
    )
      return false;

    const viewer = ev.viewer;
    const evPoint = new Vector2(ev.viewerX!, ev.viewerY!);
    const targetPoint = [...this.points[targetPointIndex], this.z] as Vector3D;
    return this.hitPointTest(viewer, evPoint, targetPoint);
  }

  protected boundingBox3() {
    const points = this.points;
    const box = new Box3().makeEmpty();
    points.forEach(point => box.expandByPoint(new Vector3(...point, this.z)));
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

  protected hitTest(
    ev: ViewerEvent
  ): { hitType: PolylineHitType; findHitPointIndex: number } | undefined {
    const viewer = ev.viewer;
    const evPoint = new Vector2(ev.viewerX!, ev.viewerY!);

    const findHitPointIndex = this.findHitPointIndex(viewer, evPoint);
    if (findHitPointIndex > -1) {
      return { hitType: 'point-move', findHitPointIndex };
    }

    const hitType = hitBoundingRectWithHandles(
      evPoint,
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
    evPoint: Vector2,
    point: Vector3D
  ): boolean {
    const hitPoint = convertVolumePointToViewerPoint(viewer, ...point);
    const hitBox = new Box2(
      new Vector2(hitPoint.x - handleSize, hitPoint.y - handleSize),
      new Vector2(hitPoint.x + handleSize, hitPoint.y + handleSize)
    );
    return hitRectangle(evPoint, hitBox, handleSize);
  }

  protected findHitPointIndex(viewer: Viewer, evPoint: Vector2): number {
    return this.points.findIndex(point =>
      this.hitPointTest(viewer, evPoint, [...point, this.z!])
    );
  }
}
