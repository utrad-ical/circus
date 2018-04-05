import Annotation from './Annotation';
import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';
import Sprite from '../viewer/Sprite';
import { Vector2, Vector3 } from 'three';
import {
  convertVolumeCoordinateToScreenCoordinate,
  detectOrthogonalSection
} from '../section-util';

export type FigureType = 'rectangle' | 'circle';

export default class PlaneFigure implements Annotation {
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

  public draw(viewer: Viewer, viewState: ViewState): Sprite | null {
    if (!viewer || !viewState) return null;
    const canvas = viewer.canvas;
    if (!canvas) return null;
    if (viewState.type !== 'mpr') return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Displays only when the volume is displayed as an axial slice
    const orientation = detectOrthogonalSection(viewState.section);
    if (orientation !== 'axial') return null;

    const resolution = new Vector2().fromArray(viewer.getResolution());
    if (!this.color || !this.min || !this.max) return null;

    if (this.z === undefined) return null;
    const zDiff = Math.abs(this.z - viewState.section.origin[2]);
    if (zDiff > this.zDimmedThreshold) return null;
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

    try {
      ctx.save();
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
    } finally {
      ctx.restore();
    }
    return null;
  }
}
