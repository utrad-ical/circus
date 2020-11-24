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

  // dragInfo
  private dragInfo:
    | {
        originalBoundingBox3: [number[], number[]];
        dragStartVolumePoint3: number[];
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

  public static calculateBoundingBoxWithDefaultDepth(
    viewer: Viewer
  ): { min: Vector3D; max: Vector3D } {
    const ratio = 0.25;
    const section = viewer.getState().section;
    const orientation = detectOrthogonalSection(section);
    const resolution = new Vector2().fromArray(viewer.getResolution());

    const halfLength = Math.min(resolution.x, resolution.y) * ratio * 0.5;

    const screenCenter = new Vector2().fromArray([
      resolution.x * 0.5,
      resolution.y * 0.5
    ]);

    const min = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2().fromArray([
        screenCenter.x - halfLength,
        screenCenter.y - halfLength
      ])
    );

    const max = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2().fromArray([
        screenCenter.x + halfLength,
        screenCenter.y + halfLength
      ])
    );

    const boundingBox = SolidFigure.getBoundingBoxWithResetDepth(
      orientation,
      new Box3().expandByPoint(min).expandByPoint(max)
    );

    return {
      min: [boundingBox.min.x, boundingBox.min.y, boundingBox.min.z],
      max: [boundingBox.max.x, boundingBox.max.y, boundingBox.max.z]
    };
  }

  public validate(): boolean {
    const min = this.min;
    const max = this.max;
    if (!min || !max) return false;
    return min.some((value, index) => {
      return value !== max[index];
    });
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
      concreteBoundingBox = SolidFigure.getBoundingBoxWithResetDepth(
        orientation,
        penddingBoundingBox
      );
    } else {
      concreteBoundingBox = penddingBoundingBox;
    }
    this.min = concreteBoundingBox.min.toArray();
    this.max = concreteBoundingBox.max.toArray();
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
