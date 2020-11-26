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
import EllipsoidTool from './annotation/EllipsoidTool';
import CuboidTool from './annotation/CuboidTool';
import PointTool from './annotation/PointTool';
import WandTool from './cloud/WandTool';
import WandEraserTool from './cloud/WandEraserTool';

type ToolClass<T extends ToolBaseClass> = { new (): T };

interface AnyToolClasses {
  [toolName: string]: ToolClass<any>;
}

interface ToolClasses extends AnyToolClasses {
  hand: ToolClass<HandTool>;
  window: ToolClass<WindowTool>;
  zoom: ToolClass<ZoomTool>;
  pager: ToolClass<PagerTool>;
  celestialRotate: ToolClass<CelestialRotateTool>;

  circle: ToolClass<CircleTool>;
  rectangle: ToolClass<RectangleTool>;
  point: ToolClass<PointTool>;

  ellipsoid: ToolClass<EllipsoidTool>;
  cuboid: ToolClass<CuboidTool>;

  brush: ToolClass<BrushTool>;
  eraser: ToolClass<EraserTool>;
  bucket: ToolClass<BucketTool>;
  wand: ToolClass<WandTool>;
  wandEraser: ToolClass<WandEraserTool>;
}

const defaultTools: ToolClasses & { null: ToolClass<ToolBaseClass> } = {
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

type ToolInstance<T> = T extends ToolClass<infer I> ? I : never;
type AnyTool<T> = T extends keyof ToolClasses
  ? ToolInstance<ToolClasses[T]>
  : any;

export type ToolCollection = {
  [K in keyof ToolClasses]: AnyTool<K>;
};
const toolCollection = Object.entries(defaultTools).reduce(
  (collection, [toolName, toolClass]) => ({
    ...collection,
    [toolName]: new toolClass()
  }),
  {} as ToolCollection
);

export function registerTool(
  toolName: string,
  toolClass: typeof ToolBaseClass
): void {
  if (toolName in toolCollection) {
    throw new Error('This tool name is already assigned');
  }
  toolCollection[toolName] = new toolClass();
}

export function toolFactory<K extends keyof ToolCollection>(
  key: K
): ToolCollection[K] {
  return toolCollection[key];
}
