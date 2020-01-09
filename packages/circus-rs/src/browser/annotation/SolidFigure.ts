import { Box2, Box3, Vector2, Vector3 } from 'three';
import { Section } from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  convertScreenCoordinateToVolumeCoordinate,
  detectOrthogonalSection,
  OrientationString,
  polygonVerticesOfBoxAndSection,
  sectionOverlapsPolygon
} from '../section-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import drawBoundingBoxCrossHair from './helper/drawBoundingBoxCrossHair';
import drawBoundingBoxOutline from './helper/drawBoundingBoxOutline';
import drawHandleFrame from './helper/drawHandleFrame';
import getHandleType, {
  cursorSettableHandleType,
  HandleType
} from './helper/getHandleType';
import resize from './helper/resize';

export type FigureType = 'cuboid' | 'ellipsoid';

const defaultLineWidth = 3;
const defaultStrokeStyle = '#ff88ff';

export interface LineDrawStyle {
  width: number;
  color: string;
}

export default abstract class SolidFigure
  implements Annotation, ViewerEventTarget {
  public abstract type: FigureType;
  /**
   * Boundary of the outline, measured in mm.
   */
  public min?: number[];

  /**
   * Boundary of the outline, measured in mm.
   */
  public max?: number[];

  public color: string = defaultStrokeStyle;
  public width: number = defaultLineWidth;
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

  // dragInfo
  private dragInfo:
    | {
        originalBoundingBox3: [number[], number[]];
        dragStartScreenPoint: number[];
        dragStartVolumePoint3: number[];
        dragTotalMovement: [number, number];
      }
    | undefined;

  // handleInfo
  private handleType: HandleType | undefined = undefined;

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

  private static getBoundingBoxWithResetDepth(
    orientation: OrientationString,
    penddingBoundingBox: Box3
  ): Box3 {
    const min = penddingBoundingBox.min;
    const max = penddingBoundingBox.max;
    var newMin: Vector3;
    var newMax: Vector3;
    var adjustedValue;
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

  public validate(): boolean | undefined {
    const min = this.min;
    const max = this.max;

    return (
      min &&
      max &&
      min.some((value, index) => {
        return value !== max[index];
      })
    );
  }

  public concreate(orientation?: OrientationString): void {
    // boundingBox
    const min = this.min;
    const max = this.max;
    if (!min || !max) return;

    const penddingBoundingBox = new Box3()
      .expandByPoint(new Vector3().fromArray(min))
      .expandByPoint(new Vector3().fromArray(max));
    var concreateBoundingBox: Box3;
    if (this.resetDepthOfBoundingBox && orientation) {
      concreateBoundingBox = SolidFigure.getBoundingBoxWithResetDepth(
        orientation,
        penddingBoundingBox
      );
    } else {
      concreateBoundingBox = penddingBoundingBox;
    }
    this.min = concreateBoundingBox.min.toArray();
    this.max = concreateBoundingBox.max.toArray();
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

      const crossSectionalShapeBoundingBox2: Box2 = crossSectionalShapeVertices2.reduce(
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

    const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);

    const min = this.min;
    const max = this.max;
    if (!min || !max) return;

    const handleType = getHandleType(viewer, point, min, max);
    if (handleType) {
      ev.stopPropagation();
      if (cursorSettableHandleType.some(type => type === handleType)) {
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
      const handleType = getHandleType(viewer, point, min, max);
      if (handleType) {
        const state = viewer.getState() as MprViewState;
        const resolution: [number, number] = viewer.getResolution();
        this.handleType = handleType;
        this.dragInfo = {
          originalBoundingBox3: [min.concat(), max.concat()],
          dragStartScreenPoint: point.toArray(),
          dragStartVolumePoint3: convertScreenCoordinateToVolumeCoordinate(
            state.section,
            new Vector2().fromArray(resolution),
            point.clone()
          ).toArray(),
          dragTotalMovement: [0, 0]
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

      this.dragInfo!.dragTotalMovement![0] += ev.original.movementX;
      this.dragInfo!.dragTotalMovement![1] += ev.original.movementY;
      const draggedPoint: [number, number] = [
        this.dragInfo!.dragStartScreenPoint![0] +
          this.dragInfo!.dragTotalMovement![0],
        this.dragInfo!.dragStartScreenPoint![1] +
          this.dragInfo!.dragTotalMovement![1]
      ];

      const viewState = viewer.getState() as MprViewState;
      const resolution: [number, number] = viewer.getResolution();
      const orientation = detectOrthogonalSection(viewState.section);
      const draggedPoint3 = convertScreenCoordinateToVolumeCoordinate(
        viewState.section,
        new Vector2().fromArray(resolution),
        new Vector2().fromArray(draggedPoint)
      );
      const delta = draggedPoint3.sub(
        new Vector3().fromArray(this.dragInfo!.dragStartVolumePoint3!)
      );

      const handleType = this.handleType;
      const originalBoundingBox3 = this.dragInfo!.originalBoundingBox3!;
      const newBoundingBox3 = resize(
        handleType,
        orientation,
        originalBoundingBox3,
        delta
      );
      this.min = newBoundingBox3[0];
      this.max = newBoundingBox3[1];

      const comp = viewer.getComposition();
      if (comp) comp.annotationUpdated();
    }
  }

  public dragEndHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;

    if (viewer.getHoveringAnnotation() === this) {
      ev.stopPropagation();

      const comp = viewer.getComposition();

      if (this.validate()) {
        this.concreate();
      } else {
        if (comp) comp.removeAnnotation(this);
      }
      if (comp) comp.annotationUpdated();

      viewer.setCursorStyle('');
    }
  }
}
