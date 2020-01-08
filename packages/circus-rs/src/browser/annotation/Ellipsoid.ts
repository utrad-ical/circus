import {
  getInscribedEllipse,
  getInscribedEllipsoid
} from '../../common/geometry/Ellipsoid';
import drawEllipseWithMuddyWay from './helper/drawEllipseWithMuddyWay';
import { drawEllipse, drawOutline } from './helper/drawObject';
import intersectEllipsoidAndSection from './helper/getEllipseUsing5Points';
import SolidFigure, { FigureType } from './SolidFigure';

/**
 * Ellipsoid annotation
 */
export default class Ellipsoid extends SolidFigure {
  public type: FigureType = 'ellipsoid';

  public figureDrawStyle: {
    muddyWay: boolean;
    using5Points: boolean;
    muddyWayFillStyle?: string;
  } = { muddyWay: true, using5Points: true };

  protected drawFigure(): void {
    const ctx = this.drawFigureParams!.ctx;

    if (this.resetDepthOfBoundingBox) {
      const crossSectionalShapeBoundingBox2 = this.drawFigureParams!
        .crossSectionalShapeBoundingBox2;
      const ellipse = getInscribedEllipse(crossSectionalShapeBoundingBox2);
      drawEllipse(
        ctx,
        {
          origin: ellipse.origin,
          radiusX: ellipse.radiusX,
          radiusY: ellipse.radiusY,
          rotate: 0
        },
        {
          strokeStyle: this.color,
          lineWidth: this.width
        }
      );
    } else {
      const boundingBox3 = this.drawFigureParams!.boundingBox3;
      const epllipsoid = getInscribedEllipsoid(boundingBox3);

      const resolution = this.drawFigureParams!.resolution;
      const section = this.drawFigureParams!.section;

      if (this.figureDrawStyle.muddyWay) {
        const drawingTargetAreaBoundingBox2 = this.drawFigureParams!
          .drawingTargetBoundingBox2;
        const fillStyle = this.figureDrawStyle.muddyWayFillStyle;
        drawEllipseWithMuddyWay(
          ctx,
          epllipsoid,
          resolution,
          section,
          drawingTargetAreaBoundingBox2,
          { fillStyle }
        );
      }

      if (this.figureDrawStyle.using5Points) {
        const ellipse = intersectEllipsoidAndSection(
          epllipsoid,
          section,
          resolution,
          ctx
        );
        drawEllipse(ctx, ellipse, {
          strokeStyle: this.color,
          lineWidth: this.width
        });
      }
    }
  }
}
