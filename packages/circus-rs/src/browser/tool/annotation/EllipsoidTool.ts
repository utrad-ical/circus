import { FigureType } from '../../annotation/SolidFigure';
import SolidFigureTool from './SolidFigureTool';

/**
 * EllipsoidTool
 */
export default class EllipsoidTool extends SolidFigureTool {
  protected figureType: FigureType = 'ellipsoid';
}
