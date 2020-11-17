import WandTool from '@utrad-ical/circus-rs/src/browser/tool/cloud/WandTool';

export interface VoxelCloudToolState {
  activeTool: string;
  lineWidth: number;
  wandMode: '2d' | '3d';
  wandThreshold: number;
  wandMaxDistance: number;
}

type Actions =
  | SetActiveToolAction
  | SetLineWidthAction
  | SetWandModeAction
  | SetWandThresholdAction
  | SetMaxDistanceAction;

export const initialState = (): VoxelCloudToolState => ({
  activeTool: '',
  lineWidth: 1,
  wandMode: WandTool.defaultMode,
  wandThreshold: WandTool.defaultThreshold,
  wandMaxDistance: WandTool.defaultMaxDistance
});

type SetActiveToolAction = ReturnType<typeof setActiveTool>;
export const setActiveTool = (activeTool: string) => ({
  type: 'setActiveTool' as 'setActiveTool',
  activeTool
});

type SetLineWidthAction = ReturnType<typeof setLineWidth>;
export const setLineWidth = (lineWidth: number) => ({
  type: 'setLineWidth' as 'setLineWidth',
  lineWidth
});

type SetWandModeAction = ReturnType<typeof setWandMode>;
export const setWandMode = (wandMode: '2d' | '3d') => ({
  type: 'setWandMode' as 'setWandMode',
  wandMode
});

type SetWandThresholdAction = ReturnType<typeof setWandThreshold>;
export const setWandThreshold = (wandThreshold: number) => ({
  type: 'setWandThreshold' as 'setWandThreshold',
  wandThreshold
});

type SetMaxDistanceAction = ReturnType<typeof setWandMaxDistance>;
export const setWandMaxDistance = (wandMaxDistance: number) => ({
  type: 'setWandMaxDistance' as 'setWandMaxDistance',
  wandMaxDistance
});

export function reducer<S extends VoxelCloudToolState = VoxelCloudToolState>(
  state: S,
  action: Actions
): S {
  switch (action.type) {
    case 'setActiveTool':
      return state.activeTool !== action.activeTool
        ? { ...state, activeTool: action.activeTool }
        : state;
    case 'setLineWidth':
      return state.lineWidth !== action.lineWidth
        ? { ...state, lineWidth: action.lineWidth }
        : state;
    case 'setWandMode':
      return state.wandMode !== action.wandMode
        ? { ...state, wandMode: action.wandMode }
        : state;
    case 'setWandThreshold':
      return state.wandThreshold !== action.wandThreshold
        ? { ...state, wandThreshold: action.wandThreshold }
        : state;
    case 'setWandMaxDistance':
      return state.wandMaxDistance !== action.wandMaxDistance
        ? { ...state, wandMaxDistance: action.wandMaxDistance }
        : state;
  }
  return state;
}
