import type { FigureType } from '../../annotation/SolidFigure.ts';
import SolidFigureTool from './SolidFigureTool.ts';

/**
 * CuboidTool
 */
export default class CuboidTool extends SolidFigureTool {
  protected figureType: FigureType = 'cuboid';
}
