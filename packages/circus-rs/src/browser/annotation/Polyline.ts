import { Vector2D } from 'circus-rs/src/common/geometry';
import { Vector2, Vector3 } from 'three';
import ViewerEventTarget from '../interface/ViewerEventTarget';
import {
  convertVolumeCoordinateToScreenCoordinate,
  detectOrthogonalSection
} from '../section-util';
import Viewer from '../viewer/Viewer';
import ViewerEvent from '../viewer/ViewerEvent';
import ViewState from '../ViewState';
import Annotation, { DrawOption } from './Annotation';
import { drawPath, drawPoint } from './helper/drawObject';

const handleSize = 5;

export default class Polyline implements Annotation, ViewerEventTarget {
  /**
   * Color of the outline.
   */
  public color: string = '#ff8800';
  public dimmedColor: string = '#ff88ff55';

  /**
   * Color of the fill.
   */
  public fillColor: string = '#ff880050'; //TODO: Check the default settings
  public dimmedFillColor: string = '#ff88ff25'; //TODO: Check the default settings
  /**
   * Width of the line that connects each end.
   */
  public width: number = 3;

  /**
   * Radius of the connector circle.
   */
  public radius: number = 3; //TODO: Check the default settings

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
  public fillMode: 'nonzero' | 'evenodd' = 'evenodd';
  public id?: string;

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
    if (!this.color || this.points.length === 0) return;

    if (this.z === undefined) return;
    const zDiff = Math.abs(this.z - viewState.section.origin[2]);
    if (zDiff > this.zDimmedThreshold) return;
    const color = zDiff > this.zThreshold ? this.dimmedColor : this.color;
    const fillColor =
      zDiff > this.zThreshold ? this.dimmedFillColor : this.fillColor;
    const drawStyle = {
      lineWidth: this.width,
      closePath: this.closed,
      strokeStyle: color,
      fillStyle: fillColor,
      fillRule: this.fillMode,
      markerSize: this.radius
    };

    const screenPoints = this.points.map(p =>
      convertVolumeCoordinateToScreenCoordinate(
        viewState.section,
        resolution,
        new Vector3(p[0], p[1], this.z ? this.z : 0)
      )
    );

    // Draw lines
    if (screenPoints.length > 2) {
      drawPath(ctx, screenPoints, drawStyle);
    } else if (screenPoints.length === 1) {

    }

    // Draw points
    screenPoints.forEach(screenPoint => {
      drawPoint(ctx, screenPoint, {
        radius: this.radius,
        color
      });
    });
  }

  public validate(): boolean {
    if (this.points.length === 0 || !this.z) return false;
    return true;
  }

  public mouseMoveHandler(ev: ViewerEvent): void {
    // TODO: doramari
  }

  public dragStartHandler(ev: ViewerEvent): void {
    // TODO: doramari
  }

  public dragHandler(ev: ViewerEvent): void {
    // TODO: doramari
  }

  public dragEndHandler(ev: ViewerEvent): void {
    // TODO: doramari
  }
}
