import CircleTool from './annotation/CircleTool.ts';
import CuboidTool from './annotation/CuboidTool.ts';
import EllipsoidTool from './annotation/EllipsoidTool.ts';
import PointTool from './annotation/PointTool.ts';
import PolylineTool from './annotation/PolylineTool.ts';
import RectangleTool from './annotation/RectangleTool.ts';
import RulerTool from './annotation/RulerTool.ts';
import BrushTool from './cloud/BrushTool.ts';
import BucketTool from './cloud/BucketTool.ts';
import BucketEraserTool from './cloud/BucketEraserTool.ts';
import EraserTool from './cloud/EraserTool.ts';
import WandEraserTool from './cloud/WandEraserTool.ts';
import WandTool from './cloud/WandTool.ts';
import CelestialRotateTool from './state/CelestialRotateTool.ts';
import HandTool from './state/HandTool.ts';
import PagerTool from './state/PagerTool.ts';
import WindowTool from './state/WindowTool.ts';
import ZoomTool from './state/ZoomTool.ts';
import ToolBaseClass from './Tool.ts';

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
  ruler: ToolClass<RulerTool>;

  circle: ToolClass<CircleTool>;
  rectangle: ToolClass<RectangleTool>;
  polyline: ToolClass<PolylineTool>;
  point: ToolClass<PointTool>;

  ellipsoid: ToolClass<EllipsoidTool>;
  cuboid: ToolClass<CuboidTool>;

  brush: ToolClass<BrushTool>;
  eraser: ToolClass<EraserTool>;
  bucket: ToolClass<BucketTool>;
  bucketEraser: ToolClass<BucketEraserTool>;
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
  ruler: RulerTool,

  circle: CircleTool,
  rectangle: RectangleTool,
  polyline: PolylineTool,
  point: PointTool,

  ellipsoid: EllipsoidTool,
  cuboid: CuboidTool,

  brush: BrushTool,
  eraser: EraserTool,
  bucket: BucketTool,
  bucketEraser: BucketEraserTool,
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
