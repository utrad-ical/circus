import { Tool } from './tool';
import { WindowTool } from './state/window';
import { HandTool } from './state/hand';
import { ZoomTool } from './state/zoom';
import { PagerTool } from './state/pager';
import { CelestialRotateTool } from './state/celestial-rotate';
import { BrushTool } from './cloud/brush';

const toolCollection = {};

const defaultTools = {
	null: Tool, // Null tool that ignores all UI events only to show a static image
	hand: HandTool,
	window: WindowTool,
	zoom: ZoomTool,
	pager: PagerTool,
	celestialRotate: CelestialRotateTool,
	
	brush: BrushTool
};

Object.keys(defaultTools).forEach(key => {
	const toolClass = defaultTools[key];
	toolCollection[key] = new toolClass();
});

export function registerTool(toolName: string, toolClass: typeof Tool): void {
	if (toolName in toolCollection) {
		throw new Error('This tool name is already assined');
	}
	toolCollection[toolName] = new toolClass();
}

export function toolFactory(key: string): Tool {
	return toolCollection[key];
}
