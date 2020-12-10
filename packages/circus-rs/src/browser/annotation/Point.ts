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

  private handleType: PointHitType | undefined = undefined;
  private dragStartPointOnScreen: Vector2 | undefined = undefined;
  private original:
    | {
        origin: Vector3D;
      }
    | undefined = undefined;

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (!viewer || !viewState) return;
    if (!this.origin) return;
    const canvas = viewer.canvas;
    if (!canvas) return;
    if (viewState.type !== 'mpr') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const color = this.getColor(viewState.section);
    if (!color) return;

    const screenPoint = convertVolumePointToViewerPoint(viewer, ...this.origin);
    drawPoint(ctx, screenPoint, { radius: this.radius, color });
  }

  private getColor(section: Section): string | undefined {
    const distance = distanceFromPointToSection(
      section,
      new Vector3(...this.origin!)
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
    return !!this.origin;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;
    if (!this.editable) return;
    if (!this.origin) return;

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
    if (!this.origin) return;

    if (viewer.getHoveringAnnotation() === this && this.handleType) {
      ev.stopPropagation();

      this.dragStartPointOnScreen = new Vector2(ev.viewerX!, ev.viewerY!);
      this.original = {
        origin: this.origin
      };
    }
  }

  private hitTest(ev: ViewerEvent): PointHitType | undefined {
    if (!this.origin) return;

    const viewer = ev.viewer;
    const point = new Vector2(ev.viewerX!, ev.viewerY!);

    const hitPoint = convertVolumePointToViewerPoint(viewer, ...this.origin);
    const hitBox = new Box2(
      new Vector2(hitPoint.x - this.radius, hitPoint.y - this.radius),
      new Vector2(hitPoint.x + this.radius, hitPoint.y + this.radius)
    );
    if (hitRectangle(point, hitBox, 5)) {
      return 'point-move';
    }

    return;
  }

  public dragHandler(ev: ViewerEvent): void {
    const viewer = ev.viewer;
    const viewState = viewer.getState();
    if (!viewer || !viewState) return;
    if (viewState.type !== 'mpr') return;

    if (viewer.getHoveringAnnotation() === this && this.handleType) {
      ev.stopPropagation();

      const draggedTotal = new Vector2(
        ev.viewerX! - this.dragStartPointOnScreen!.x,
        ev.viewerY! - this.dragStartPointOnScreen!.y
      );
      const originalPointOnScreen = convertVolumePointToViewerPoint(
        ev.viewer,
        ...this.original!.origin
      );
      this.origin = convertViewerPointToVolumePoint(
        ev.viewer,
        originalPointOnScreen.x + draggedTotal.x,
        originalPointOnScreen.y + draggedTotal.y
      ).toArray() as Vector3D;

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
      this.dragStartPointOnScreen = undefined;
      this.original = undefined;
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
