import { drawOutline } from './helper/drawObject';
import SolidFigure, { FigureType, LineDrawStyle } from './SolidFigure';

/**
 * Cuboid annotation
 */
export default class Cuboid extends SolidFigure {
  public type: FigureType = 'cuboid';

  protected drawFigure(): void {
    const ctx = this.drawFigureParams!.ctx;
    const crossSectionalShapeVertices2 = this.drawFigureParams!
      .crossSectionalShapeVertices2;

    drawOutline(ctx, crossSectionalShapeVertices2, {
      strokeStyle: this.color,
      lineWidth: this.width
    });
  }
}
