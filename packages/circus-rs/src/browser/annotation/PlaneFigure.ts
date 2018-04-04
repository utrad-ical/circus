import Annotation from './Annotation';
import Viewer from '../viewer/Viewer';
import ViewState from '../ViewState';
import Sprite from '../viewer/Sprite';

export type FigureType = 'rectangle' | 'circle';

export default class PlaneFigure implements Annotation {
  public color: string = '#ffffff';
  public width: number = 3;
  public min?: number[];
  public max?: number[];
  public type: FigureType = 'circle';

  public draw(viewer: Viewer, viewState: ViewState): Sprite | null {
    if (!viewer || !viewState) return null;
    const canvas = viewer.canvas;
    if (!canvas) return null;
    if (viewState.type !== 'mpr') return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (!this.color || !this.min || !this.max) return null;

    const min = this.min;
    const max = this.max;
    try {
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.width;
      ctx.beginPath();
      if (this.type === 'circle') {
        ctx.save(); // Nested save to do path translation
        ctx.translate(this.min[0], this.min[1]);
        ctx.scale(
          (this.max[0] - this.min[0]) / 2,
          (this.max[1] - this.min[1]) / 2
        );
        ctx.arc(1, 1, 1, 0, 2 * Math.PI);
        ctx.restore();
        ctx.stroke();
      } else {
        ctx.rect(
          this.min[0],
          this.min[1],
          this.max[0] - this.min[0],
          this.max[1] - this.min[1]
        );
        ctx.stroke();
      }
    } finally {
      ctx.restore();
    }
    return null;
  }
}
