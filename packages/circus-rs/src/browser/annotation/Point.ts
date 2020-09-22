import Annotation, { DrawOption } from './Annotation';
import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';
import { Vector2, Vector3 } from 'three';
import { convertVolumeCoordinateToScreenCoordinate } from '../section-util';
import { distanceFromPointToSection } from '../../common/geometry';

/**
 * Draws a 3D point annotation.
 */
export default class Point implements Annotation {
  /**
   * Color of the marker circle.
   */
  public color: string = '#ff88ff';

  /**
   * Radius of the marker circle.
   */
  public radius: number = 3;

  /**
   * The X coordinate of the point.
   */
  public x: number = 0;

  /**
   * The Y coordinate of the point.
   */
  public y: number = 0;

  /**
   * The Z coordinate of the point.
   */
  public z: number = 0;

  public id?: string;

  /**
   * The marker cirlce will be drawn when the distance between the point
   * and the section is smaller than this value.
   */
  public distanceThreshold: number = 0.1;

  public dimmedColor: string = '#ff88ff55';
  public distanceDimmedThreshold: number = 3;

  public draw(viewer: Viewer, viewState: ViewState, option: DrawOption): void {
    if (!viewer || !viewState) return;
    const canvas = viewer.canvas;
    if (!canvas) return;
    if (viewState.type !== 'mpr') return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolution = new Vector2().fromArray(viewer.getResolution());
    if (!this.color) return;
    if (this.z === undefined) return;

    const distance = distanceFromPointToSection(
      viewState.section,
      new Vector3(this.x, this.y, this.z)
    );
    if (distance > this.distanceDimmedThreshold) return;
    const color =
      distance > this.distanceThreshold ? this.dimmedColor : this.color;

    const loc = convertVolumeCoordinateToScreenCoordinate(
      viewState.section,
      resolution,
      new Vector3(this.x, this.y, this.z)
    );

    ctx.save();
    try {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(loc.x, loc.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } finally {
      ctx.restore();
    }
  }
}
