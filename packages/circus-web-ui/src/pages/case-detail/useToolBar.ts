import * as rs from '@utrad-ical/circus-rs/src/browser';
import ToolBaseClass from '@utrad-ical/circus-rs/src/browser/tool/Tool';
import * as ToolBarState from './ToolBarState';
import {
  useState,
  useCallback,
  useReducer,
  useLayoutEffect,
  useRef
} from 'react';

export default function useToolBar() {
  const [state, dispatch] = useReducer(
    ToolBarState.reducer,
    ToolBarState.initialState()
  );

  const toolsRef = useRef<{ [key: string]: ToolBaseClass }>({});

  const [tool, setTool] = useState<ToolBaseClass | null>(null);
  const getTool = useCallback(
    (toolName: string): ToolBaseClass => {
      const tools = toolsRef.current;
      if (!(toolName in tools)) {
        console.log('Activate tool: ' + toolName);
        const tool = rs.toolFactory(toolName);
        tools[toolName] = tool;
      }
      return tools[toolName];
    },
    [toolsRef.current]
  );

  const {
    activeTool,
    lineWidth,
    wandMode,
    wandThreshold,
    wandMaxDistance
  } = state;

  useLayoutEffect(() => {
    setTool(getTool(activeTool));
  }, [setTool, getTool, activeTool]);

  useLayoutEffect(() => {
    if (!ToolBarState.brushTools.some(t => t === activeTool)) return;

    const brushOption = { width: lineWidth };
    getTool('brush').setOptions(brushOption);
    getTool('eraser').setOptions(brushOption);

    const wandOption = {
      mode: wandMode,
      threshold: wandThreshold,
      maxDistance: wandMaxDistance
    };
    getTool('wand').setOptions(wandOption);
    getTool('wandEraser').setOptions(wandOption);
  }, [
    getTool,
    activeTool,
    lineWidth,
    wandMode,
    wandThreshold,
    wandMaxDistance
  ]);

  return [state, dispatch, tool] as [
    typeof state,
    typeof dispatch,
    typeof tool
  ];
}
