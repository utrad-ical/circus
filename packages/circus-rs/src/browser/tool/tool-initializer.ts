import { Tool } from './tool';
import { WindowTool } from './state/window';
import { HandTool } from './state/hand';
import { ZoomTool } from './state/zoom';
import { PagerTool } from './state/pager';
import { CelestialRotateTool } from './state/celestial-rotate';
import { BrushTool } from './cloud/brush';
import { EraserTool } from './cloud/eraser';
import { BucketTool } from './cloud/bucket';

import { VRRotateZoomTool } from './state/vr-rotate-zoom';

const toolCollection = {};

const defaultTools = {
  null: Tool, // Null tool that ignores all UI events only to show a static image
  hand: HandTool,
  window: WindowTool,
  zoom: ZoomTool,
  pager: PagerTool,
  celestialRotate: CelestialRotateTool,

  brush: BrushTool,
  eraser: EraserTool,
  bucket: BucketTool,

  'vr-rotate-zoom': VRRotateZoomTool
};

Object.keys(defaultTools).forEach(key => {
  const toolClass = defaultTools[key];
  toolCollection[key] = new toolClass();
});

export function registerTool(toolName: string, toolClass: typeof Tool): void {
  if (toolName in toolCollection) {
    throw new Error('This tool name is already assigned');
  }
  toolCollection[toolName] = new toolClass();
}

export function toolFactory(key: string): Tool {
  return toolCollection[key];
}
