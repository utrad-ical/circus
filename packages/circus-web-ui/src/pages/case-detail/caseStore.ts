import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EditingData, Revision, ExternalLabel } from './revisionData';
import PatientInfo from '../../types/PatientInfo';
import Project from 'types/Project';
import Series from 'types/Series';

interface CaseData {
  caseId: string;
  revisions: Revision<ExternalLabel>[];
  projectId: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface CaseDetailState {
  busy: boolean;
  caseData: CaseData | null;
  patientInfo?: PatientInfo;
  editingRevisionIndex: number;
  projectData?: Project;
  seriesData?: { [seriesUid: string]: Series };
  history: EditingData[];
  /**
   * Used to remember the type of the last operation and
   * coalesce similar history items.
   */
  historyTag?: string;
  currentHistoryIndex: number;
  /**
   * This counter is incremented for each redu/undo.
   * Used to "refresh" the two attributes editors.
   */
  refreshCounter: number;
  caseAttributesAreValid: boolean;
  labelAttributesAreValid: boolean;
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
    patientInfo: undefined,
    editingRevisionIndex: -1,
    history: [],
    currentHistoryIndex: 0,
    refreshCounter: 0,
    caseAttributesAreValid: false,
    labelAttributesAreValid: false
  } as CaseDetailState,
  reducers: {
    setBusy: (s, action: PayloadAction<boolean>) => {
      s.busy = action.payload;
    },
    loadInitialCaseData: (
      s,
      action: PayloadAction<{
        caseData: any;
        patientInfo?: PatientInfo;
        seriesData: { [seriesUid: string]: Series };
        projectData: Project;
      }>
    ) => {
      const { caseData, patientInfo, seriesData, projectData } = action.payload;
      s.caseData = caseData;
      s.patientInfo = patientInfo;
      s.seriesData = seriesData;
      s.projectData = projectData;
    },
    loadRevisions: (s, action: PayloadAction<Revision<ExternalLabel>[]>) => {
      s.caseData!.revisions = action.payload;
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
      s.refreshCounter++;
      s.busy = false;
    },
    change: (
      s,
      action: PayloadAction<{
        newData: EditingData;
        /**
         * Tag is used to avoid pushing too many similar history items.
         * Changes with the same tag will be coalesced into one history item.
         * Pass nothing if each history item is important!
         */
        tag?: string;
      }>
    ) => {
      if (s.busy) throw new Error('Tried to change revision while loading');
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
        s.refreshCounter++;
      }
    },
    redo: s => {
      if (s.currentHistoryIndex < s.history.length - 1) {
        s.currentHistoryIndex++;
        s.refreshCounter++;
      }
    },
    validateCaseAttributes: (s, action: PayloadAction<boolean>) => {
      const valid = action.payload;
      s.caseAttributesAreValid = valid;
    },
    validateLabelAttributes: (s, action: PayloadAction<boolean>) => {
      const valid = action.payload;
      s.labelAttributesAreValid = valid;
    }
  }
});

export default slice.reducer as (
  state: CaseDetailState,
  action: any
) => CaseDetailState;

export const {
  setBusy,
  loadInitialCaseData,
  loadRevisions,
  startLoadRevision,
  loadRevision,
  change,
  undo,
  redo,
  validateCaseAttributes,
  validateLabelAttributes
} = slice.actions;
