import { Box2, Vector2, Vector3 } from 'three';
import { Vector2D, verticesOfBox } from '../../common/geometry';
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
import Annotation, { DrawHints } from './Annotation';
import drawHandleFrame, { defaultHandleSize } from './helper/drawHandleFrame';
import {
  BoundingRectWithHandleHitType,
  hitBoundingRectWithHandles
} from './helper/hit-test';
import resize from './helper/resize';
import ModifierKeyBehaviors from './ModifierKeyBehaviors';

export type FigureType = 'rectangle' | 'circle';

const cursorTypes: {
  [key in BoundingRectWithHandleHitType]: { cursor: string };
} = {
  'north-west-handle': { cursor: 'nw-resize' },
  'north-handle': { cursor: 'n-resize' },
  'north-east-handle': { cursor: 'ne-resize' },
  'east-handle': { cursor: 'e-resize' },
  'south-east-handle': { cursor: 'se-resize' },
  'south-handle': { cursor: 's-resize' },
  'south-west-handle': { cursor: 'sw-resize' },
  'west-handle': { cursor: 'w-resize' },
  'rect-outline': { cursor: 'move' }
};

const isValidViewState = (
  viewState: ViewState | undefined
): viewState is MprViewState | TwoDimensionalViewState => {
  if (!viewState) return false;
  if (viewState.type === 'mpr') return true;
  if (viewState.type === '2d') return true;
  return false;
};

export default class PlaneFigure
  implements Annotation, ViewerEventTarget, ModifierKeyBehaviors
{
  public editable: boolean = false;
  private handleType: BoundingRectWithHandleHitType | undefined = undefined;

  public lockMaintainAspectRatio: boolean = false;
  public lockFixCenterOfGravity: boolean = false;

  // dragInfo
  private dragInfo:
    | {
        originalBoundingBox3: [number[], number[]];
        dragStartVolumePoint3: number[];
      }
    | undefined;

  /**
   * Color of the outline.
   */
  public color: string = '#ff88ff';

  /**
   * Width of the outline.
   */
  public width: number = 3;

  /**
   * Boundary of the outline, measured in mm.
   */
  public min?: Vector2D;

  /**
   * Boundary of the outline, measured in mm.
   */
  public max?: Vector2D;

  /**
   * The Z coordinate of the outline.
   */
  public z?: number;

  /**
   * Displays the outline when z is below this threshold.
   */
  public zThreshold: number = 0.1;

  public dimmedColor: string = '#ff88ff55';
  public zDimmedThreshold: number = 3;

  public type: FigureType = 'circle';

  public id?: string;

  public draw(viewer: Viewer, viewState: ViewState, hints: DrawHints): void {
    if (!viewer || !isValidViewState(viewState)) return;
    if (!this.color || !this.min || !this.max || this.z === undefined) return;

    const color = this.determineDrawingColorFromViewState(viewState);
    if (!color) return;

    const section =
      viewState.type !== '2d'
        ? viewState.section
        : sectionFrom2dViewState(viewState);
    const resolution = new Vector2().fromArray(viewer.getResolution());
    const min = convertVolumeCoordinateToScreenCoordinate(
      section,
      resolution,
      new Vector3(this.min[0], this.min[1], this.z ? this.z : 0)
    );
    const max = convertVolumeCoordinateToScreenCoordinate(
      section,
      resolution,
      new Vector3(this.max[0], this.max[1], this.z ? this.z : 0)
    );

    const canvas = viewer.canvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.save();
    try {
      ctx.strokeStyle = color;
      ctx.lineWidth = this.width;
      ctx.beginPath();
      if (this.type === 'circle') {
        ctx.save(); // Nested save to do path translation
        ctx.translate(min.x, min.y);
        ctx.scale((max.x - min.x) / 2, (max.y - min.y) / 2);
        ctx.arc(1, 1, 1, 0, 2 * Math.PI);
        ctx.restore();
        ctx.stroke();
      } else {
        ctx.rect(min.x, min.y, max.x - min.x, max.y - min.y);
        ctx.stroke();
      }

      // draw handle frame
      if (this.editable && hints.hover) {
        const drawStyle = {
          handleSize: 5,
          lineWidth: 1,
          strokeStyle: '#ff0000'
        };
        const frameVertices2 = verticesOfBox(
          new Box2().expandByPoint(min).expandByPoint(max)
        );
        drawHandleFrame(ctx, frameVertices2, drawStyle);
      }
    } finally {
      ctx.restore();
    }
  }

  private determineDrawingColorFromViewState(
    state: ViewState
  ): string | undefined {
    if (this.z === undefined) return;

    switch (state.type) {
      case '2d': {
        const { imageNumber } = state;
        return this.z === imageNumber ? this.color : undefined;
      }
      case 'mpr': {
        const { section } = state;
        // Displays only when the volume is displayed as an axial slice
        const orientation = detectOrthogonalSection(section);
        if (orientation !== 'axial') return;
        const distance = Math.abs(this.z - section.origin[2]);
        switch (true) {
          case distance <= this.zThreshold:
            return this.color;
          case distance <= this.zDimmedThreshold:
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

  private determineHandleType(
    viewer: Viewer,
    point: Vector2
  ): BoundingRectWithHandleHitType | undefined {
    if (!this.min || !this.max || this.z === undefined) return;

    const minPoint = convertVolumePointToViewerPoint(
      viewer,
      this.min[0],
      this.min[1],
      this.z
    );
    const maxPoint = convertVolumePointToViewerPoint(
      viewer,
      this.max[0],
      this.max[1],
      this.z
    );
    const boundingBox = new Box2(minPoint, maxPoint);
    return hitBoundingRectWithHandles(point, boundingBox, defaultHandleSize);
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    if (!this.editable) return;

    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!isValidViewState(viewState)) return;

    const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
    const handleType = this.determineHandleType(viewer, point);
    if (handleType) {
      ev.stopPropagation();
      this.handleType = handleType;
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
    if (!this.editable) return;
    if (this.z === undefined) return;
    if (!this.min || !this.max) return;

    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;

    const viewState = viewer.getState();
    if (!isValidViewState(viewState)) return;

    ev.stopPropagation();

    const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
    const handleType = this.determineHandleType(viewer, point);
    if (!handleType) return;

    const dragStartVolumePoint3 = convertViewerPointToVolumePoint(
      viewer,
      ev.viewerX!,
      ev.viewerY!
    );

    this.handleType = handleType;
    this.dragInfo = {
      originalBoundingBox3: [
        [this.min[0], this.min[1], this.z],
        [this.max[0], this.max[1], this.z]
      ],
      dragStartVolumePoint3: dragStartVolumePoint3.toArray()
    };
  }

  public dragHandler(ev: ViewerEvent): void {
    if (!this.editable) return;
    if (!this.dragInfo) return;

    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;

    const viewState = viewer.getState();
    if (!isValidViewState(viewState)) return;

    ev.stopPropagation();

    const dragPoint3 = convertViewerPointToVolumePoint(
      viewer,
      ev.viewerX!,
      ev.viewerY!
    );

    const dragStartVolumePoint3 = new Vector3().fromArray(
      this.dragInfo.dragStartVolumePoint3
    );

    const maintainAspectRatio = this.lockMaintainAspectRatio !== ev.shiftKey;
    const fixCenterOfGravity = this.lockFixCenterOfGravity !== ev.ctrlKey;

    const originalBoundingBox3 = this.dragInfo.originalBoundingBox3;

    const newBoundingBox3 = resize(
      this.handleType!,
      'axial',
      originalBoundingBox3,
      dragStartVolumePoint3,
      dragPoint3,
      maintainAspectRatio,
      fixCenterOfGravity
    );

    this.min = [newBoundingBox3[0][0], newBoundingBox3[0][1]];
    this.max = [newBoundingBox3[1][0], newBoundingBox3[1][1]];

    const comp = viewer.getComposition();
    if (!comp) return;
    comp.dispatchAnnotationChanging(this);
    comp.annotationUpdated();
  }

  public dragEndHandler(ev: ViewerEvent): void {
    if (!this.editable) return;

    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() !== this) return;

    ev.stopPropagation();

    this.handleType = undefined;
    viewer.setCursorStyle('');

    const comp = viewer.getComposition();
    if (
      this.min &&
      this.max &&
      this.min[0] !== this.max[0] &&
      this.min[1] !== this.max[1]
    ) {
      const newMin: Vector2D = [
        Math.min(this.min[0], this.max[0]),
        Math.min(this.min[1], this.max[1])
      ];
      const newMax: Vector2D = [
        Math.max(this.min[0], this.max[0]),
        Math.max(this.min[1], this.max[1])
      ];
      this.min = newMin;
      this.max = newMax;
    } else {
      if (comp) comp.removeAnnotation(this);
    }
    if (comp) comp.dispatchAnnotationChange(this);
    if (comp) comp.annotationUpdated();
  }

  public validate(): boolean {
    const min = this.min;
    const max = this.max;
    if (!min || !max) return false;
    return min.some((value, index) => value !== max[index]);
  }
}
