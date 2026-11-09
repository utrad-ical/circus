import type { FigureType } from '../../annotation/PlaneFigure.ts';
import PlaneFigureTool from './PlaneFigureTool.ts';

/**
 * CircleTool
 */
export default class CircleTool extends PlaneFigureTool {
  protected figureType: FigureType = 'circle';
}
