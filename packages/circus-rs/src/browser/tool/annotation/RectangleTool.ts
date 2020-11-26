import { FigureType } from '../../annotation/PlaneFigure';
import PlaneFigureTool from './PlaneFigureTool';

export default class RectangleTool extends PlaneFigureTool {
  protected figureType: FigureType = 'circle';
}
