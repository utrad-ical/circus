import { drawOutline } from './helper/drawObject';
import SolidFigure, { FigureType } from './SolidFigure';

/**
 * Cuboid annotation
 */
export default class Cuboid extends SolidFigure {
  public type: FigureType = 'cuboid';

  constructor() {
    super();
    this.guideDrawStyle.boundingBoxCrossSectionalShape.isDraw = false;
  }

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
