import Annotation, { DrawOption } from './Annotation';
import Viewer from '../viewer/Viewer';
import ViewState, { MprViewState } from '../ViewState';
import { Vector2, Vector3 } from 'three';
import {
  convertVolumeCoordinateToScreenCoordinate,
  detectOrthogonalSection,
  convertScreenCoordinateToVolumeCoordinate
} from '../section-util';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import ViewerEvent from '../viewer/ViewerEvent';

export type FigureType = 'rectangle' | 'circle';

type HandleType =
  | 'nw-resize'
  | 'n-resize'
  | 'ne-resize'
  | 'e-resize'
  | 'se-resize'
  | 's-resize'
  | 'sw-resize'
  | 'w-resize'
  | 'move';

const handleSize = 5;

export default class PlaneFigure implements Annotation, ViewerEventTarget {
  public editable: boolean = false;
  private handleType: undefined | HandleType = undefined;
  private dragStartPoint: Vector2 | undefined = undefined;
  private dragTotalMovement: [number, number] | undefined = undefined;
  private dragStartPoint3: Vector3 | undefined = undefined;
  private originalBoundingBox3: [Vector3, Vector3] | undefined = undefined;

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
  public min?: number[];

  /**
   * Boundary of the outline, measured in mm.
   */
  public max?: number[];

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

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (!viewer || !viewState) return;
    const canvas = viewer.canvas;
    if (!canvas) return;
    if (viewState.type !== 'mpr') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Displays only when the volume is displayed as an axial slice
    const orientation = detectOrthogonalSection(viewState.section);
    if (orientation !== 'axial') return;

    const resolution = new Vector2().fromArray(viewer.getResolution());
    if (!this.color || !this.min || !this.max) return;

    if (this.z === undefined) return;
    const zDiff = Math.abs(this.z - viewState.section.origin[2]);
    if (zDiff > this.zDimmedThreshold) return;
    const color = zDiff > this.zThreshold ? this.dimmedColor : this.color;

    const min = convertVolumeCoordinateToScreenCoordinate(
      viewState.section,
      resolution,
      new Vector3(this.min[0], this.min[1], this.z ? this.z : 0)
    );
    const max = convertVolumeCoordinateToScreenCoordinate(
      viewState.section,
      resolution,
      new Vector3(this.max[0], this.max[1], this.z ? this.z : 0)
    );

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

      if (this.editable && option.hover) this.drawFrame(ctx, min, max);
    } finally {
      ctx.restore();
    }
  }

  private drawFrame(ctx: CanvasRenderingContext2D, min: Vector2, max: Vector2) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#ff0000';

    const center = min.clone().add(
      max
        .clone()
        .sub(min)
        .multiplyScalar(0.5)
    );
    const drawHandle = (x: number, y: number) => {
      ctx.rect(x - handleSize, y - handleSize, handleSize * 2, handleSize * 2);
    };
    drawHandle(min.x, min.y);
    drawHandle(min.x, center.y);
    drawHandle(min.x, max.y);
    drawHandle(center.x, min.y);
    drawHandle(center.x, max.y);
    drawHandle(max.x, min.y);
    drawHandle(max.x, center.y);
    drawHandle(max.x, max.y);
    ctx.stroke();

    ctx.moveTo(min.x + handleSize, min.y);
    ctx.lineTo(center.x - handleSize, min.y);
    ctx.moveTo(center.x + handleSize, min.y);
    ctx.lineTo(max.x - handleSize, min.y);
    ctx.moveTo(max.x, min.y + handleSize);
    ctx.lineTo(max.x, center.y - handleSize);
    ctx.moveTo(max.x, center.y + handleSize);
    ctx.lineTo(max.x, max.y - handleSize);

    ctx.moveTo(max.x - handleSize, max.y);
    ctx.lineTo(center.x + handleSize, max.y);
    ctx.moveTo(center.x - handleSize, max.y);
    ctx.lineTo(min.x + handleSize, max.y);
    ctx.moveTo(min.x, max.y - handleSize);
    ctx.lineTo(min.x, center.y + handleSize);
    ctx.moveTo(min.x, center.y - handleSize);
    ctx.lineTo(min.x, min.y + handleSize);
    ctx.stroke();
  }

  /**
   * ViewerEventHandler
   */
  public mouseMoveHandler(ev: ViewerEvent) {
    if (!this.editable) return;

    const viewer = ev.viewer;

    const boundingBox = this.getBoundingBox(viewer);
    if (!boundingBox) return;

    const [min, max] = boundingBox;
    const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);

    const handleType = this.getHandleType(boundingBox, point);

    if (handleType) {
      ev.stopPropagation();

      switch (handleType) {
        case 'nw-resize':
        case 'n-resize':
        case 'ne-resize':
        case 'e-resize':
        case 'se-resize':
        case 's-resize':
        case 'sw-resize':
        case 'w-resize':
        case 'move':
          viewer.setCursorStyle(handleType);
      }
      this.handleType = handleType;

      viewer.setHoveringAnnotation(this);
      viewer.renderAnnotations();
    } else if (viewer.getHoveringAnnotation() === this) {
      viewer.setHoveringAnnotation(undefined);
      viewer.setCursorStyle('');
      viewer.renderAnnotations();
    }
  }

  public dragStartHandler(ev: ViewerEvent) {
    if (!this.editable) return;

    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();

      const boundingBox = this.getBoundingBox(viewer);
      if (!boundingBox) return;

      const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
      const handleType = this.getHandleType(boundingBox, point);

      if (handleType) {
        this.dragStartPoint = point;
        this.dragTotalMovement = [0, 0];
        this.handleType = handleType;

        const state = viewer.getState() as MprViewState;
        const resolution: [number, number] = viewer.getResolution();
        this.dragStartPoint3 = convertScreenCoordinateToVolumeCoordinate(
          state.section,
          new Vector2().fromArray(resolution),
          new Vector2().fromArray([point.x, point.y])
        );
        this.originalBoundingBox3 = [
          new Vector3().fromArray([...this.min!, this.z!]),
          new Vector3().fromArray([...this.max!, this.z!])
        ];
      }
    }
  }

  public dragHandler(ev: ViewerEvent) {
    if (!this.editable) return;

    const viewer = ev.viewer;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();
      this.dragTotalMovement![0] += ev.original.movementX;
      this.dragTotalMovement![1] += ev.original.movementY;

      const screenPoint: [number, number] = [
        this.dragStartPoint!.x + this.dragTotalMovement![0],
        this.dragStartPoint!.y + this.dragTotalMovement![1]
      ];
      const state = viewer.getState() as MprViewState;
      const resolution: [number, number] = viewer.getResolution();
      const draggedPoint3 = convertScreenCoordinateToVolumeCoordinate(
        state.section,
        new Vector2().fromArray(resolution),
        new Vector2().fromArray(screenPoint)
      );

      const [startMin, startMax] = this.originalBoundingBox3!;
      const dist = draggedPoint3.sub(this.dragStartPoint3!);

      switch (this.handleType) {
        case 'nw-resize':
          this.min = [startMin.x + dist.x, startMin.y + dist.y];
          break;
        case 'n-resize':
          this.min = [startMin.x, startMin.y + dist.y];
          break;
        case 'ne-resize':
          this.min = [startMin.x, startMin.y + dist.y];
          this.max = [startMax.x + dist.x, startMax.y];
          break;
        case 'e-resize':
          this.max = [startMax.x + dist.x, startMax.y];
          break;
        case 'se-resize':
          this.max = [startMax.x + dist.x, startMax.y + dist.y];
          break;
        case 's-resize':
          this.max = [startMax.x, startMax.y + dist.y];
          break;
        case 'sw-resize':
          this.min = [startMin.x + dist.x, startMin.y];
          this.max = [startMax.x, startMax.y + dist.y];
          break;
        case 'w-resize':
          this.min = [startMin.x + dist.x, startMin.y];
          break;
        case 'move':
          this.min = [startMin.x + dist.x, startMin.y + dist.y];
          this.max = [startMax.x + dist.x, startMax.y + dist.y];
          break;
      }

      const comp = viewer.getComposition();
      if (comp) comp.annotationUpdated();
    }
  }

  public dragEndHandler(ev: ViewerEvent) {
    if (!this.editable) return;

    const viewer = ev.viewer;
    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();

      const comp = viewer.getComposition();
      if (
        this.min &&
        this.max &&
        this.min[0] !== this.max[0] &&
        this.min[1] !== this.max[1]
      ) {
        const newMin = [
          Math.min(this.min[0], this.max[0]),
          Math.min(this.min[1], this.max[1])
        ];
        const newMax = [
          Math.max(this.min[0], this.max[0]),
          Math.max(this.min[1], this.max[1])
        ];
        this.min = newMin;
        this.max = newMax;
      } else {
        if (comp) comp.removeAnnotation(this);
      }
      if (comp) comp.annotationUpdated();

      this.handleType = undefined;
      this.dragStartPoint = undefined;
      this.dragTotalMovement = undefined;
      viewer.setCursorStyle('');
    }
  }

  private getBoundingBox(viewer: Viewer): [Vector2, Vector2] | undefined {
    const viewState = viewer.getState();

    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;

    // Displays only when the volume is displayed as an axial slice
    const orientation = detectOrthogonalSection(viewState.section);
    if (orientation !== 'axial') return;

    const resolution = new Vector2().fromArray(viewer.getResolution());
    if (!this.color || !this.min || !this.max) return;

    if (this.z === undefined) return;
    const zDiff = Math.abs(this.z - viewState.section.origin[2]);
    if (zDiff > this.zDimmedThreshold) return;

    const min = convertVolumeCoordinateToScreenCoordinate(
      viewState.section,
      resolution,
      new Vector3(this.min[0], this.min[1], this.z ? this.z : 0)
    );
    const max = convertVolumeCoordinateToScreenCoordinate(
      viewState.section,
      resolution,
      new Vector3(this.max[0], this.max[1], this.z ? this.z : 0)
    );

    return [min, max];
  }

  private getHandleType(
    boundingBox: [Vector2, Vector2],
    point: Vector2
  ): HandleType | undefined {
    const [min, max] = boundingBox;

    const inBoundingBox =
      min.x - handleSize <= point.x &&
      point.x <= max.x + handleSize &&
      min.y - handleSize <= point.y &&
      point.y <= max.y + handleSize;

    if (!inBoundingBox) return;

    const onLeftEdge =
      min.x - handleSize <= point.x && point.x <= min.x + handleSize;
    const onRightEdge =
      max.x - handleSize <= point.x && point.x <= max.x + handleSize;
    const onTopEdge =
      min.y - handleSize <= point.y && point.y <= min.y + handleSize;
    const onBottomEdge =
      max.y - handleSize <= point.y && point.y <= max.y + handleSize;

    const xCenter = min.x + (max.x - min.x) / 2;
    const yCenter = min.y + (max.y - min.y) / 2;
    const onHorizontalCenter =
      xCenter - handleSize <= point.x && point.x <= xCenter + handleSize;
    const onVertialCenter =
      yCenter - handleSize <= point.y && point.y <= yCenter + handleSize;

    switch (true) {
      case onLeftEdge && onTopEdge:
        return 'nw-resize';
      case onTopEdge && onHorizontalCenter:
        return 'n-resize';
      case onTopEdge && onRightEdge:
        return 'ne-resize';
      case onRightEdge && onVertialCenter:
        return 'e-resize';
      case onRightEdge && onBottomEdge:
        return 'se-resize';
      case onBottomEdge && onHorizontalCenter:
        return 's-resize';
      case onBottomEdge && onLeftEdge:
        return 'sw-resize';
      case onLeftEdge && onVertialCenter:
        return 'w-resize';
      case onLeftEdge || onRightEdge || onTopEdge || onBottomEdge:
        return 'move';
      default:
        return undefined;
    }
  }
}
