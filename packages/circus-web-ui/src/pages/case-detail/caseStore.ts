import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EditingData, Revision } from './revisionData';
import Project from 'types/Project';

export interface CaseDetailState {
  busy: boolean;
  caseData: any;
  editingRevisionIndex: number;
  projectData?: Project;
  history: EditingData[];
  historyTag?: string;
  currentHistoryIndex: number;
}

const maxHistoryLength = 10;

export const current = (s: CaseDetailState) => s.history[s.currentHistoryIndex];

export const canUndo = (s: CaseDetailState) => s.currentHistoryIndex > 0;

export const canRedo = (s: CaseDetailState) =>
  s.currentHistoryIndex < s.history.length - 1;

const slice = createSlice({
  name: 'caseData',
  initialState: {
    busy: false,
    caseData: null,
    editingRevisionIndex: -1,
    history: [],
    currentHistoryIndex: 0
  } as CaseDetailState,
  reducers: {
    setBusy: (s, action: PayloadAction<boolean>) => {
      s.busy = action.payload;
    },
    loadCaseData: (
      s,
      action: PayloadAction<{
        caseData: any;
        projectData: Project;
      }>
    ) => {
      const { caseData, projectData } = action.payload;
      s.caseData = caseData;
      s.projectData = projectData;
    },
    startEditing: (
      s,
      action: PayloadAction<{
        revision: Revision;
        revisionIndex: number;
      }>
    ) => {
      const { revision, revisionIndex } = action.payload;
      const editingData: EditingData = {
        revision,
        activeSeriesIndex: 0,
        activeLabelIndex: (revision.series[0].labels || []).length > 0 ? 0 : -1
      };
      s.history = [editingData];
      s.editingRevisionIndex = revisionIndex;
      s.currentHistoryIndex = 0;
    },
    change: (
      s,
      action: PayloadAction<{
        newData: EditingData;
        /**
         * Tag is used to avoid pushing too many history items.
         * Changes with the same tag will be fused to one history item.
         */
        tag?: string;
      }>
    ) => {
      const { tag, newData } = action.payload;
      s.history = s.history.slice(0, s.currentHistoryIndex + 1);
      if (typeof tag === 'string' && tag.length > 0 && tag === s.historyTag) {
        s.history.pop();
        s.currentHistoryIndex--;
      }
      s.history.push(newData);
      s.currentHistoryIndex++;
      if (history.length > maxHistoryLength) {
        s.history = s.history.slice(-maxHistoryLength);
        s.currentHistoryIndex = s.history.length - 1;
      }
      s.historyTag = tag;
    },
    undo: s => {
      if (s.currentHistoryIndex > 0) {
        s.currentHistoryIndex--;
      }
    },
    redo: s => {
      if (s.currentHistoryIndex < s.history.length - 1) {
        s.currentHistoryIndex++;
      }
    }
  }
});

export default slice.reducer as (
  state: CaseDetailState,
  action: any
) => CaseDetailState;

export const {
  setBusy,
  loadCaseData,
  startEditing,
  change,
  undo,
  redo
} = slice.actions;
