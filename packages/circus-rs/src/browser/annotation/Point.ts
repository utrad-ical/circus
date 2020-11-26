import { Vector2, Vector3 } from 'three';
import { distanceFromPointToSection, Vector3D } from '../../common/geometry';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  convertScreenCoordinateToVolumeCoordinate,
  convertVolumeCoordinateToScreenCoordinate,
  detectOrthogonalSection
} from '../section-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState, { MprViewState } from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import { drawPoint } from './helper/drawObject';
import getHandleType, {
  cursorSettableHandleType,
  HandleType
} from './helper/getHandleType';
import resize from './helper/resize';

export default class Point implements Annotation, ViewerEventTarget {
  /**
   * Color of the marker circle.
   */
  public color: string = '#ff88ff';
  /**
   * Coordinate of the point, measured in mm.
   */
  public origin?: Vector3D;
  /**
   * Radius of the marker circle.
   */
  public radius: number = 3;
  /**
   * The marker cirlce will be drawn when the distance between the point
   * and the section is smaller than this value.
   */
  public distanceThreshold: number = 0.1;
  public dimmedColor: string = '#ff88ff55';
  public distanceDimmedThreshold: number = 3;
  public editable: boolean = true;
  public id?: string;

  private handleType: HandleType | undefined = undefined;
  private dragInfo:
    | {
        originalBoundingBox3: [number[], number[]];
        dragStartVolumePoint3: number[];
      }
    | undefined;

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (!viewer || !viewState) return;
    if (!this.origin) return;
    const canvas = viewer.canvas;
    if (!canvas) return;
    if (viewState.type !== 'mpr') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = (() => {
      const distance = distanceFromPointToSection(
        viewState.section,
        new Vector3(...this.origin)
      );
      if (distance > this.distanceDimmedThreshold) return;
      return distance > this.distanceThreshold ? this.dimmedColor : this.color;
    })();
    if (!color) return;

    const screenPoint = convertVolumeCoordinateToScreenCoordinate(
      viewState.section,
      new Vector2().fromArray(viewer.getResolution()),
      new Vector3(...this.origin)
    );

    drawPoint(ctx, screenPoint, { radius: this.radius, color });
  }

  public validate(): boolean {
    const origin = this.origin;
    return !!origin;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;

    const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);

    const origin = this.origin;
    if (!origin) return;

    const handleType = getHandleType(viewer, point, origin, origin);
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

      const origin = this.origin;
      if (!origin) return;
      const point: Vector2 = new Vector2(ev.viewerX!, ev.viewerY!);
      const handleType = getHandleType(viewer, point, origin, origin);
      if (handleType) {
        const state = viewer.getState() as MprViewState;
        const resolution: [number, number] = viewer.getResolution();
        this.handleType = handleType;
        this.dragInfo = {
          originalBoundingBox3: [origin.concat(), origin.concat()],
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
      const point = newBoundingBox3[0];
      this.origin = [...point] as Vector3D;

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

  public static calculateDefaultPoint(viewer: Viewer): { origin: Vector3D } {
    const section = viewer.getState().section;
    const resolution = new Vector2().fromArray(viewer.getResolution());
    const screenCenter = new Vector2().fromArray([
      resolution.x * 0.5,
      resolution.y * 0.5
    ]);
    const centerPoint = convertScreenCoordinateToVolumeCoordinate(
      section,
      resolution,
      new Vector2().fromArray([screenCenter.x, screenCenter.y])
    );
    return { origin: [centerPoint.x, centerPoint.y, centerPoint.z] };
  }
}
