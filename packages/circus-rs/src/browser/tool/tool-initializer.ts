import CircleTool from './annotation/CircleTool';
import CuboidTool from './annotation/CuboidTool';
import EllipsoidTool from './annotation/EllipsoidTool';
import PointTool from './annotation/PointTool';
import RectangleTool from './annotation/RectangleTool';
import BrushTool from './cloud/BrushTool';
import BucketTool from './cloud/BucketTool';
import EraserTool from './cloud/EraserTool';
import WandEraserTool from './cloud/WandEraserTool';
import WandTool from './cloud/WandTool';
import CelestialRotateTool from './state/CelestialRotateTool';
import HandTool from './state/HandTool';
import PagerTool from './state/PagerTool';
import WindowTool from './state/WindowTool';
import ZoomTool from './state/ZoomTool';
import ToolBaseClass from './Tool';

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

  ellipsoid: EllipsoidTool,
  cuboid: CuboidTool,

  brush: BrushTool,
  eraser: EraserTool,
  bucket: BucketTool,
  wand: WandTool,
  wandEraser: WandEraserTool
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
