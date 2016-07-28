import { Tool } from './tool';
import { WindowTool } from './state/window';
import { HandTool } from './state/hand';
import { CelestialRotateTool } from './state/celestial-rotate';

const toolCollection = {};

const defaultTools = {
	null: Tool, // Null tool that ignores all UI events only to show a static image
	hand: HandTool,
	window: WindowTool,
	celestialRotate: CelestialRotateTool
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
