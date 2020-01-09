import {
  getInscribedEllipse,
  getInscribedEllipsoid
} from '../../common/geometry/Ellipsoid';
import debugFillEllipse from './helper/debugFillEllipse';
import { drawEllipse, drawOutline } from './helper/drawObject';
import intersectEllipsoidAndSection from './helper/getEllipseUsing5Points';
import SolidFigure, { FigureType, LineDrawStyle } from './SolidFigure';

/**
 * Ellipsoid annotation
 */
export default class Ellipsoid extends SolidFigure {
  public type: FigureType = 'ellipsoid';

  public boundingBoxCrossSectionalShape: LineDrawStyle = {
    width: 1,
    color: 'rgba(0, 0, 255, 0.8)'
  };

  private debugFill: string | undefined = undefined; // 'rgba(255, 255, 0, 0.3)';

  protected drawFigure(): void {
    const ctx = this.drawFigureParams!.ctx;
    const crossSectionalShapeVertices2 = this.drawFigureParams!
      .crossSectionalShapeVertices2;

    // draw bounding box cross-sectional shape
    const drawBoundingBoxCrossSectionalShape = this
      .boundingBoxCrossSectionalShape;
    if (drawBoundingBoxCrossSectionalShape) {
      const {
        color: strokeStyle,
        width: lineWidth
      } = drawBoundingBoxCrossSectionalShape;

      drawOutline(ctx, crossSectionalShapeVertices2, {
        lineWidth,
        strokeStyle
      });
    }

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

      if (this.debugFill) {
        debugFillEllipse(
          ctx,
          epllipsoid,
          resolution,
          section,
          this.drawFigureParams!.drawingTargetBoundingBox2,
          this.debugFill
        );
      }

      const ellipse = intersectEllipsoidAndSection(
        epllipsoid,
        section,
        resolution
      );
      drawEllipse(ctx, ellipse, {
        strokeStyle: this.color,
        lineWidth: this.width
      });
    }
  }
}
