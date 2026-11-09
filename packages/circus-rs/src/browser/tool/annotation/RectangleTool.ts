import type { FigureType } from '../../annotation/PlaneFigure.ts';
import PlaneFigureTool from './PlaneFigureTool.ts';

export default class RectangleTool extends PlaneFigureTool {
  protected figureType: FigureType = 'rectangle';
}
