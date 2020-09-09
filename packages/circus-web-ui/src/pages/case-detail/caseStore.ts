import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EditingData, Revision, ExternalLabel } from './revisionData';
import Project from 'types/Project';

interface CaseData {
  caseId: string;
  revisions: Revision<ExternalLabel>[];
  patientInfo: any; // TODO: remove this
  projectId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface CaseDetailState {
  busy: boolean;
  caseData: CaseData | null;
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
    startLoadRevision: (
      s,
      action: PayloadAction<{ revisionIndex: number }>
    ) => {
      const { revisionIndex } = action.payload;
      if (s.editingRevisionIndex !== revisionIndex) {
        s.editingRevisionIndex = revisionIndex;
        s.busy = true;
      }
    },
    loadRevision: (s, action: PayloadAction<{ revision: Revision }>) => {
      const { revision } = action.payload;
      const editingData: EditingData = {
        revision,
        activeSeriesIndex: 0,
        activeLabelIndex: (revision.series[0].labels || []).length > 0 ? 0 : -1
      };
      s.history = [editingData];
      s.currentHistoryIndex = 0;
      s.busy = false;
    },
    change: (
      s,
      action: PayloadAction<{
        newData: EditingData;
        /**
         * Tag is used to avoid pushing too many history items.
         * Changes with the same tag will be fused to one history item.
         * Pass nothing if each history item is important!
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
  loadCaseData,
  startLoadRevision,
  loadRevision,
  change,
  undo,
  redo
} = slice.actions;
