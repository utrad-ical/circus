import { drawSimpleFigure } from './helper/drawObject.ts';
import type { FigureType } from './SolidFigure.ts';
import SolidFigure from './SolidFigure.ts';

/**
 * Cuboid annotation
 */
export default class Cuboid extends SolidFigure {
  public type: FigureType = 'cuboid';

  protected drawFigure(): void {
    const ctx = this.drawFigureParams!.ctx;
    const crossSectionalShapeVertices2 =
      this.drawFigureParams!.crossSectionalShapeVertices2;

    drawSimpleFigure(ctx, crossSectionalShapeVertices2, {
      lineWidth: this.width,
      strokeStyle: this.color,
      fillStyle: this.fillColor
    });
  }
}
