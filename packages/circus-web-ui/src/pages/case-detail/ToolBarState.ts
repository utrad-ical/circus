import WandTool from '@utrad-ical/circus-rs/src/browser/tool/cloud/WandTool';
import { createSelector } from 'reselect';

export const brushTools = ['brush', 'eraser', 'bucket', 'wand', 'wandEraser'];

export interface State {
  activeTool: string;
  lineWidth: number;
  wandMode: '2d' | '3d';
  wandThreshold: number;
  wandMaxDistance: number;
  volumeLoaded: boolean;
  enableVoxelCloudEditor: boolean;
}

export type Actions =
  | SetActiveToolAction
  | SetLineWidthAction
  | SetWandModeAction
  | SetWandThresholdAction
  | SetMaxDistanceAction
  | SetVolumeLoadedAction
  | SetEnableVoxelCloudEditorAction;

export const initialState = (): State => ({
  activeTool: 'pager',
  lineWidth: 1,
  wandMode: WandTool.defaultMode,
  wandThreshold: WandTool.defaultThreshold,
  wandMaxDistance: WandTool.defaultMaxDistance,
  volumeLoaded: false,
  enableVoxelCloudEditor: false
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

type SetVolumeLoadedAction = ReturnType<typeof setVolumeLoaded>;
export const setVolumeLoaded = (volumeLoaded: boolean) => ({
  type: 'setVolumeLoaded' as 'setVolumeLoaded',
  volumeLoaded
});

type SetEnableVoxelCloudEditorAction = ReturnType<
  typeof setEnableVoxelCloudEditor
>;
export const setEnableVoxelCloudEditor = (enableVoxelCloudEditor: boolean) => ({
  type: 'setEnableVoxelCloudEditor' as 'setEnableVoxelCloudEditor',
  enableVoxelCloudEditor
});

export function reducer<S extends State = State>(state: S, action: Actions): S {
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
    case 'setVolumeLoaded':
      return state.volumeLoaded !== action.volumeLoaded
        ? { ...state, volumeLoaded: action.volumeLoaded }
        : state;
    case 'setEnableVoxelCloudEditor':
      return state.enableVoxelCloudEditor !== action.enableVoxelCloudEditor
        ? {
            ...state,
            enableVoxelCloudEditor: action.enableVoxelCloudEditor
            // activeTool: brushTools.some(t => t === state.activeTool)
            //   ? 'pager'
            //   : state.activeTool
          }
        : state;
  }
  return state;
}

const baseSelector = (i: State): State => i;
export const getHighlightTool = createSelector(baseSelector, state =>
  !state.enableVoxelCloudEditor &&
  brushTools.some(tool => tool === state.activeTool)
    ? 'pager'
    : state.activeTool
);
export const getBrushToolIsEnabled = createSelector(
  baseSelector,
  state => state.enableVoxelCloudEditor
);
export const getWandToolIsEnabled = createSelector(
  baseSelector,
  state => state.enableVoxelCloudEditor && state.volumeLoaded
);
