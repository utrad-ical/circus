import ToolBaseClass from './Tool';
import WindowTool from './state/WindowTool';
import HandTool from './state/HandTool';
import ZoomTool from './state/ZoomTool';
import PagerTool from './state/PagerTool';
import CelestialRotateTool from './state/CelestialRotateTool';
import BrushTool from './cloud/BrushTool';
import EraserTool from './cloud/EraserTool';
import BucketTool from './cloud/BucketTool';
import CircleTool from './annotation/CircleTool';
import RectangleTool from './annotation/RectangleTool';
import PointTool from './annotation/PointTool';

const toolCollection: { [toolName: string]: ToolBaseClass } = {};

const defaultTools: { [toolName: string]: typeof ToolBaseClass } = {
  null: ToolBaseClass, // Null tool that ignores all UI events only to show a static image
  hand: HandTool,
  window: WindowTool,
  zoom: ZoomTool,
  pager: PagerTool,
  celestialRotate: CelestialRotateTool,

  circle: CircleTool,
  rectangle: RectangleTool,
  point: PointTool,

  brush: BrushTool,
  eraser: EraserTool,
  bucket: BucketTool
};

Object.keys(defaultTools).forEach(key => {
  const toolClass = defaultTools[key];
  toolCollection[key] = new toolClass();
});

export function registerTool(
  toolName: string,
  toolClass: typeof ToolBaseClass
): void {
  if (toolName in toolCollection) {
    throw new Error('This tool name is already assigned');
  }
  toolCollection[toolName] = new toolClass();
}

export function toolFactory(key: string): ToolBaseClass {
  return toolCollection[key];
}
