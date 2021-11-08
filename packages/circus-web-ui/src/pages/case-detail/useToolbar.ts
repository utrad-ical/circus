import * as rs from '@utrad-ical/circus-rs/src/browser';
import { BrushToolOptions } from '@utrad-ical/circus-rs/src/browser/tool/cloud/BrushTool';
import { WandToolOptions } from '@utrad-ical/circus-rs/src/browser/tool/cloud/WandTool';
import ToolBaseClass from '@utrad-ical/circus-rs/src/browser/tool/Tool';
import { ToolCollection } from '@utrad-ical/circus-rs/src/browser/tool/tool-initializer';
import { useCallback, useEffect, useRef, useState } from 'react';

export type ToolName = keyof ToolCollection;
type ActiveToolSetter = <K extends keyof ToolCollection>(toolName: K) => void;

export interface ToolOptions {
  lineWidth: BrushToolOptions['width'];
  wandMode: WandToolOptions['mode'];
  wandThreshold: WandToolOptions['threshold'];
  wandMaxDistance: WandToolOptions['maxDistance'];
  wandBaseValue: WandToolOptions['baseValue'];
}

export type ToolOptionSetter = <K extends keyof ToolOptions>(
  optionName: K,
  optionValue: ToolOptions[K]
) => void;

const defaultToolOptions: ToolOptions = {
  lineWidth: 1,
  wandMode: '3d',
  wandThreshold: 450,
  wandMaxDistance: 10,
  wandBaseValue: 'clickPoint'
};

const useToolbar = (): [
  ToolBaseClass | undefined,
  {
    activeToolName: string;
    toolOptions: ToolOptions;
  },
  {
    setActiveTool: ActiveToolSetter;
    setToolOption: ToolOptionSetter;
  }
] => {
  // Tool collection
  const toolCollectionRef = useRef<Partial<ToolCollection>>({});
  const toolCollection = toolCollectionRef.current;
  const getTool = useCallback(
    <T extends keyof ToolCollection>(toolName: T): ToolCollection[T] => {
      const tool = toolCollection[toolName] || rs.toolFactory(toolName);
      toolCollection[toolName] = tool;
      return tool;
    },
    [toolCollection]
  );

  // Active tool
  const [activeToolName, setActiveTool] =
    useState<keyof ToolCollection>('pager');
  const [activeTool, applyActiveTool] = useState<ToolBaseClass>();

  useEffect(() => {
    applyActiveTool(getTool(activeToolName));
  }, [getTool, activeToolName]);

  // Tool options
  const [toolOptions, setToolOptions] =
    useState<ToolOptions>(defaultToolOptions);

  const setToolOption: ToolOptionSetter = useCallback(
    (optionName, optionValue) =>
      setToolOptions(state => ({ ...state, [optionName]: optionValue })),
    []
  );

  const lastOptionsRef = useRef<ToolOptions>();

  useEffect(() => {
    const lastOptions = lastOptionsRef.current || ({} as ToolOptions);

    if (toolOptions.lineWidth !== lastOptions.lineWidth) {
      const brushOptions = { width: toolOptions.lineWidth };
      getTool('brush').setOptions(brushOptions);
      getTool('eraser').setOptions(brushOptions);
    }

    if (
      toolOptions['wandMode'] !== lastOptions['wandMode'] ||
      toolOptions['wandThreshold'] !== lastOptions['wandThreshold'] ||
      toolOptions['wandMaxDistance'] !== lastOptions['wandMaxDistance'] ||
      toolOptions['wandBaseValue'] !== lastOptions['wandBaseValue']
    ) {
      const wandOptions = {
        mode: toolOptions.wandMode,
        threshold: toolOptions.wandThreshold,
        maxDistance: toolOptions.wandMaxDistance,
        baseValue: toolOptions.wandBaseValue
      };
      getTool('wand').setOptions(wandOptions);
      getTool('wandEraser').setOptions(wandOptions);
    }

    lastOptionsRef.current = toolOptions;
  }, [getTool, toolOptions]);

  return [
    activeTool,
    {
      activeToolName: activeToolName as string,
      toolOptions
    },
    { setActiveTool, setToolOption }
  ];
};

export default useToolbar;
