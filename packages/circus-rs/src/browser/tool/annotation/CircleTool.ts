import { FigureType } from '../../annotation/PlaneFigure';
import PlaneFigureTool from './PlaneFigureTool';

/**
 * CircleTool
 */
export default class CircleTool extends PlaneFigureTool {
  protected figureType: FigureType = 'circle';
}
