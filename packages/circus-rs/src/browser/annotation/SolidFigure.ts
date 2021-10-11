import { Box2, Box3, Vector2, Vector3 } from 'three';
import { Section, Vector3D } from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  convertScreenCoordinateToVolumeCoordinate,
  detectOrthogonalSection,
  OrientationString,
  polygonVerticesOfBoxAndSection,
  sectionOverlapsPolygon
} from '../section-util';
import { convertVolumePointToViewerPoint } from '../tool/tool-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import ModifierKeyBehaviors from './ModifierKeyBehaviors';
import drawBoundingBoxCrossHair from './helper/drawBoundingBoxCrossHair';
import drawBoundingBoxOutline from './helper/drawBoundingBoxOutline';
import drawHandleFrame, { defaultHandleSize } from './helper/drawHandleFrame';
import {
  BoundingRectWithHandleHitType,
  hitBoundingRectWithHandles
} from './helper/hit-test';
import resize from './helper/resize';

export type FigureType = 'cuboid' | 'ellipsoid';

export interface LineDrawStyle {
  width: number;
  color: string;
}

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

export default abstract class SolidFigure
  implements Annotation, ViewerEventTarget, ModifierKeyBehaviors
{
  public abstract type: FigureType;
  /**
   * Boundary of the outline, measured in mm.
   */
  public min?: Vector3D;

  /**
   * Boundary of the outline, measured in mm.
   */
  public max?: Vector3D;

  public color: string = '#ff88ff';
  public width: number = 3;

  public fillColor: string | undefined = undefined;

  public editable: boolean = false;
  public resetDepthOfBoundingBox: boolean | undefined = undefined;

  public boundingBoxOutline?: LineDrawStyle = {
    width: 1,
    color: 'rgba(255,255,255,0.5)'
  };

  public boundingBoxCrossHair?: LineDrawStyle = {
    width: 2,
    color: 'rgba(255,255,255,0.8)'
  };

  public id?: string;

  public lockMaintainAspectRatio: boolean = false;
  public lockFixCenterOfGravity: boolean = false;

  // dragInfo
  private dragInfo:
    | {
        originalBoundingBox3: [number[], number[]];
        dragStartVolumePoint3: number[];
      }
    | undefined;

  // handleInfo
  private handleType: BoundingRectWithHandleHitType | undefined = undefined;

  protected drawFigureParams:
    | {
        ctx: CanvasRenderingContext2D;
        resolution: Vector2;
        section: Section;
        boundingBox3: Box3;
        crossSectionalShapeVertices2: Vector2[];
        crossSectionalShapeBoundingBox2: Box2;
        drawingTargetBoundingBox2: Box2;
      }
    | undefined;

  public static editableOrientation: OrientationString[] = [
    'axial',
    'coronal',
    'sagittal'
  ];

  public validate(): boolean {
    const min = this.min;
    const max = this.max;
    if (!min || !max) return false;
    return min.some((value, index) => value !== max[index]);
  }

  public concrete(orientation?: OrientationString): void {
    // boundingBox
    const min = this.min;
    const max = this.max;
    if (!min || !max) return;

    const penddingBoundingBox = new Box3()
      .expandByPoint(new Vector3().fromArray(min))
      .expandByPoint(new Vector3().fromArray(max));
    let concreteBoundingBox: Box3;
    if (this.resetDepthOfBoundingBox && orientation) {
      concreteBoundingBox = getSolidFigureBoundingBoxWithResetDepth(
        orientation,
        penddingBoundingBox
      );
    } else {
      concreteBoundingBox = penddingBoundingBox;
    }
    this.min = concreteBoundingBox.min.toArray() as Vector3D;
    this.max = concreteBoundingBox.max.toArray() as Vector3D;
    this.resetDepthOfBoundingBox = undefined;

    // dragInfo
    this.dragInfo = undefined;

    // handleInfo
    this.handleType = undefined;
  }

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    try {
      if (!viewer || !viewState) return;
      if (viewState.type !== 'mpr') return;

      const canvas = viewer.canvas;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const section = viewState.section;
      const resolution = new Vector2().fromArray(viewer.getResolution());

      const min = this.min;
      const max = this.max;
      if (!min || !max) return;
      const boundingBox3 = new Box3()
        .expandByPoint(new Vector3().fromArray(min))
        .expandByPoint(new Vector3().fromArray(max));

      const crossSectionalShapeVertices2 = polygonVerticesOfBoxAndSection(
        resolution,
        section,
        boundingBox3
      );
      if (!crossSectionalShapeVertices2) return;

      const isOverlap = sectionOverlapsPolygon(
        resolution,
        section,
        crossSectionalShapeVertices2
      );
      if (!isOverlap) return;

      const crossSectionalShapeBoundingBox2: Box2 =
        crossSectionalShapeVertices2.reduce(
          (rect, vertex) => rect.expandByPoint(vertex),
          new Box2().makeEmpty()
        );

      const drawingTargetBoundingBox2: Box2 = new Box2()
        .set(new Vector2(0, 0), resolution.clone())
        .intersect(crossSectionalShapeBoundingBox2);

      // draw bounding box outline
      const drawBoundingBoxOutlineStyle = this.boundingBoxOutline;
      if (drawBoundingBoxOutlineStyle) {
        drawBoundingBoxOutline(
          ctx,
          boundingBox3,
          resolution,
          section,
          drawBoundingBoxOutlineStyle
        );
      }

      // draw bounding box cross hair
      const drawBoundingBoxCrossHairStyle = this.boundingBoxCrossHair;
      if (drawBoundingBoxCrossHairStyle) {
        drawBoundingBoxCrossHair(
          ctx,
          boundingBox3,
          resolution,
          section,
          drawBoundingBoxCrossHairStyle
        );
      }

      // draw figure
      const drawingAreaSize = drawingTargetBoundingBox2.getSize(new Vector2());
      if (drawingAreaSize.x === 0 || drawingAreaSize.y === 0) return;
      this.drawFigureParams = {
        ctx,
        resolution,
        section,
        boundingBox3,
        crossSectionalShapeVertices2,
        crossSectionalShapeBoundingBox2,
        drawingTargetBoundingBox2
      };
      this.drawFigure();

      // draw handle frame
      const orientation = detectOrthogonalSection(section);
      if (
        this.editable &&
        option.hover &&
        SolidFigure.editableOrientation.some(o => o === orientation)
      ) {
        const drawStyle = {
          handleSize: 5,
          lineWidth: 1,
          strokeStyle: '#ff0000'
        };
        drawHandleFrame(ctx, crossSectionalShapeVertices2, drawStyle);
      }
    } finally {
      this.drawFigureParams = undefined;
    }
  }

  protected abstract drawFigure(): void;

  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;

    const min = this.min;
    const max = this.max;
    if (!min || !max) return;

    const handleType = this.hitTest(ev);
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

  private hitTest(ev: ViewerEvent): BoundingRectWithHandleHitType | undefined {
    const viewer = ev.viewer;
    const point = new Vector2(ev.viewerX!, ev.viewerY!);

    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.min || !this.max) return;

    const minPoint = convertVolumePointToViewerPoint(viewer, ...this.min);
    const maxPoint = convertVolumePointToViewerPoint(viewer, ...this.max);
    const BoundingBox = new Box2(minPoint, maxPoint);

    return hitBoundingRectWithHandles(point, BoundingBox, defaultHandleSize);
  }

  public dragStartHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();

      const min = this.min;
      const max = this.max;
      if (!min || !max) return;
      const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
      const handleType = this.hitTest(ev);
      if (handleType) {
        const state = viewer.getState() as MprViewState;
        const resolution: [number, number] = viewer.getResolution();
        this.handleType = handleType;
        this.dragInfo = {
          originalBoundingBox3: [min.concat(), max.concat()],
          dragStartVolumePoint3: convertScreenCoordinateToVolumeCoordinate(
            state.section,
            new Vector2().fromArray(resolution),
            point.clone()
          ).toArray()
        };
      }
    }
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();
      const draggedPoint: [number, number] = [ev.viewerX!, ev.viewerY!];

      const viewState = viewer.getState() as MprViewState;
      const resolution: [number, number] = viewer.getResolution();
      const orientation = detectOrthogonalSection(viewState.section);
      const draggedPoint3 = convertScreenCoordinateToVolumeCoordinate(
        viewState.section,
        new Vector2().fromArray(resolution),
        new Vector2().fromArray(draggedPoint)
      );

      const originalBoundingBox3 = this.dragInfo!.originalBoundingBox3!;

      const maintainAspectRatio = this.lockMaintainAspectRatio !== ev.shiftKey;
      const fixCenterOfGravity = this.lockFixCenterOfGravity !== ev.ctrlKey;

      const newBoundingBox3 = resize(
        this.handleType!,
        orientation,
        originalBoundingBox3,
        new Vector3().fromArray(this.dragInfo!.dragStartVolumePoint3!),
        draggedPoint3,
        maintainAspectRatio,
        fixCenterOfGravity
      );
      this.min = newBoundingBox3[0];
      this.max = newBoundingBox3[1];

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
      this.concrete();

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
}

export function getSolidFigureBoundingBoxWithResetDepth(
  orientation: OrientationString,
  penddingBoundingBox: Box3
): Box3 {
  const min = penddingBoundingBox.min;
  const max = penddingBoundingBox.max;
  let newMin: Vector3;
  let newMax: Vector3;
  let adjustedValue;
  switch (orientation) {
    case 'axial':
      adjustedValue = Math.min(max.x - min.x, max.y - min.y) / 2;
      newMin = new Vector3(min.x, min.y, min.z - adjustedValue);
      newMax = new Vector3(max.x, max.y, max.z + adjustedValue);
      break;

    case 'sagittal':
      adjustedValue = Math.min(max.y - min.y, max.z - min.z) / 2;
      newMin = new Vector3(min.x - adjustedValue, min.y, min.z);
      newMax = new Vector3(max.x + adjustedValue, max.y, max.z);
      break;

    case 'coronal':
      adjustedValue = Math.min(max.x - min.x, max.z - min.z) / 2;
      newMin = new Vector3(min.x, min.y - adjustedValue, min.z);
      newMax = new Vector3(max.x, max.y + adjustedValue, max.z);
      break;

    default:
      newMin = min;
      newMax = max;
      break;
  }

  return new Box3().expandByPoint(newMin).expandByPoint(newMax);
}
