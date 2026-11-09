import type { FigureType } from '../../annotation/SolidFigure.ts';
import SolidFigureTool from './SolidFigureTool.ts';

/**
 * EllipsoidTool
 */
export default class EllipsoidTool extends SolidFigureTool {
  protected figureType: FigureType = 'ellipsoid';
}
