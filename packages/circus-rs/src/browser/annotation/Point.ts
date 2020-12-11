import { Box2, Vector2, Vector3 } from 'three';
import {
  distanceFromPointToSection,
  Section,
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
import ViewState from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import { drawPoint } from './helper/drawObject';
import { hitRectangle } from './helper/hit-test';

type PointHitType = 'point-move';

const cursorTypes: {
  [key in PointHitType]: { cursor: string };
} = {
  'point-move': { cursor: 'move' }
};

export default class Point implements Annotation, ViewerEventTarget {
  /**
   * Color of the marker circle.
   */
  public color: string = '#ff88ff';
  /**
   * Coordinate of the point, measured in mm.
   */
  public point?: Vector3D;
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

  private handleType: PointHitType | undefined = undefined;

  /**
   * Drag data for modifying the annotation when dragging.
   * This should not be depended the view state at drag started.
   */
  private dragInfo:
    | {
        dragStartPoint3: Vector3;
        originalPoint: Vector3D;
      }
    | undefined = undefined;

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (!viewer || !viewState) return;
    if (!this.point) return;
    const canvas = viewer.canvas;
    if (!canvas) return;
    if (viewState.type !== 'mpr') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = this.getColor(viewState.section);
    if (!color) return;

    const screenPoint = convertVolumePointToViewerPoint(viewer, ...this.point);
    drawPoint(ctx, screenPoint, { radius: this.radius, color });
  }

  private getColor(section: Section): string | undefined {
    const distance = distanceFromPointToSection(
      section,
      new Vector3(...this.point!)
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

  public validate(): boolean {
    return !!this.point;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;
    if (!this.point) return;

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
    if (!this.point) return;

    if (viewer.getHoveringAnnotation() === this && this.handleType) {
      ev.stopPropagation();

      this.dragInfo = {
        dragStartPoint3: convertViewerPointToVolumePoint(
          viewer,
          ev.viewerX!,
          ev.viewerY!
        ),
        originalPoint: this.point
      };
    }
  }

  private hitTest(ev: ViewerEvent): PointHitType | undefined {
    if (!this.point) return;

    const viewer = ev.viewer;
    const evPoint = new Vector2(ev.viewerX!, ev.viewerY!);

    const hitPoint = convertVolumePointToViewerPoint(viewer, ...this.point);
    const hitBox = new Box2(
      new Vector2(hitPoint.x - this.radius, hitPoint.y - this.radius),
      new Vector2(hitPoint.x + this.radius, hitPoint.y + this.radius)
    );
    if (hitRectangle(evPoint, hitBox, 5)) {
      return 'point-move';
    }

    return;
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.dragInfo) return;

    if (viewer.getHoveringAnnotation() === this && this.handleType) {
      ev.stopPropagation();

      const draggedPoint3 = convertViewerPointToVolumePoint(
        ev.viewer,
        ev.viewerX!,
        ev.viewerY!
      );
      const draggedTotal3 = new Vector3().subVectors(
        draggedPoint3,
        this.dragInfo.dragStartPoint3
      );

      this.point = [
        this.dragInfo.originalPoint[0] + draggedTotal3.x,
        this.dragInfo.originalPoint[1] + draggedTotal3.y,
        this.dragInfo.originalPoint[2] + draggedTotal3.z
      ];

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
  }

  public static calculateDefaultPoint(viewer: Viewer): { point: Vector3D } {
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
    return { point: [centerPoint.x, centerPoint.y, centerPoint.z] };
  }
}
