import * as rs from '@utrad-ical/circus-rs/src/browser';
import ToolBaseClass from '@utrad-ical/circus-rs/src/browser/tool/Tool';
import * as VoxelCloudToolState from './VoxelCloudToolState';
import {
  useState,
  useCallback,
  useReducer,
  useLayoutEffect,
  useRef
} from 'react';

export default function useToolBar() {
  const toolsRef = useRef<{ [key: string]: ToolBaseClass }>({});
  const tools = toolsRef.current;

  const [toolName, setToolName] = useState('');
  const [tool, setTool] = useState<ToolBaseClass | null>(null);

  const getTool = useCallback(
    (toolName: string): ToolBaseClass => {
      const tool = tools[toolName] || rs.toolFactory(toolName);
      tools[toolName] = tool;
      return tool;
    },
    [tools]
  );

  const changeTool = useCallback(
    (toolName: string) => {
      setToolName(toolName);
      setTool(getTool(toolName));
    },
    [getTool]
  );

  // handle options for voxel cloud tools
  const [vctState, dispatchVctState] = useReducer(
    VoxelCloudToolState.reducer,
    VoxelCloudToolState.initialState()
  );
  const { lineWidth, wandMode, wandThreshold, wandMaxDistance } = vctState;
  const handleSetLineWidth = (lineWidth: number) =>
    dispatchVctState(VoxelCloudToolState.setLineWidth(lineWidth));
  const handleSetWandMode = (wandMode: '2d' | '3d') =>
    dispatchVctState(VoxelCloudToolState.setWandMode(wandMode));
  const handleSetWandThreshold = (wandThreshold: number) =>
    dispatchVctState(VoxelCloudToolState.setWandThreshold(wandThreshold));
  const handleSetWandMaxDistance = (wandMaxDistance: number) =>
    dispatchVctState(VoxelCloudToolState.setWandMaxDistance(wandMaxDistance));
  useLayoutEffect(() => {
    getTool('brush').setOptions({ width: lineWidth });
    getTool('eraser').setOptions({ width: lineWidth });
  }, [getTool, lineWidth]);
  useLayoutEffect(() => {
    getTool('wand').setOptions({
      mode: wandMode,
      threshold: wandThreshold,
      maxDistance: wandMaxDistance
    });
    getTool('wandEraser').setOptions({
      mode: wandMode,
      threshold: wandThreshold,
      maxDistance: wandMaxDistance
    });
  }, [getTool, wandMode, wandThreshold, wandMaxDistance]);

  return {
    vctState,
    dispatchVctState,

    toolName,
    setToolName,
    tool,
    setTool,
    getTool,
    changeTool,
    handleSetLineWidth,
    handleSetWandMode,
    handleSetWandThreshold,
    handleSetWandMaxDistance,
    lineWidth,
    wandMode,
    wandThreshold,
    wandMaxDistance
  };
}
