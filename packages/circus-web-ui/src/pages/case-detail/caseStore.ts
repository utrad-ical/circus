import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import { OrientationString } from '@utrad-ical/circus-rs/src/browser/section-util';
import { Section } from '@utrad-ical/circus-rs/src/common/geometry';
import { LayoutInfo, layoutReducer } from 'components/GridContainer';
import Project from 'types/Project';
import Series from 'types/Series';
import PatientInfo from '../../types/PatientInfo';
import { ExternalLabel } from './labelData';
import { EditingData, Revision } from './revisionData';
import { ViewerDef } from './ViewerGrid';
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
  /**
   * Holds the temporary keys of labels with invalid attributes.
   */
  labelsWithInvalidAttributes: string[];
}

const maxHistoryLength = 10;

export const current = (s: CaseDetailState) => s.history[s.currentHistoryIndex];

export const canUndo = (s: CaseDetailState) => s.currentHistoryIndex > 0;

export const canRedo = (s: CaseDetailState) =>
  s.currentHistoryIndex < s.history.length - 1;

export type LayoutKind = 'twoByTwo' | 'axial' | 'sagittal' | 'coronal';

export const performLayout = (
  kind: LayoutKind,
  seriesIndex: number = 0
): [ViewerDef[], LayoutInfo] => {
  const layout: LayoutInfo = {
    columns: kind === 'twoByTwo' ? 2 : 1,
    rows: kind === 'twoByTwo' ? 2 : 1,
    positions: {}
  };
  const orientations: OrientationString[] =
    kind === 'twoByTwo' ? ['axial', 'sagittal', 'coronal', 'oblique'] : [kind];
  let tmp = layout;
  const items: ViewerDef[] = [];
  orientations.forEach(orientation => {
    const item = newViewerCellItem(seriesIndex, orientation);
    items.push(item);
    tmp = layoutReducer(tmp, {
      type: 'insertItemToEmptyCell',
      payload: { key: item.key }
    });
  });
  return [items, tmp];
};

const alphaNum = (length: number = 16) =>
  new Array(length)
    .fill(0)
    .map(() => String.fromCharCode(97 + Math.floor(Math.random() * 26)))
    .join('');

export const newViewerCellItem = (
  seriesIndex: number,
  orientation: OrientationString,
  celestialRotateMode?: boolean,
  initialSection?: Section
): ViewerDef => {
  const key = alphaNum();
  return {
    key,
    seriesIndex,
    orientation,
    celestialRotateMode:
      celestialRotateMode === undefined
        ? orientation === 'oblique'
        : celestialRotateMode,
    initialSection
  };
};

const pvdEquals = (a: PartialVolumeDescriptor, b: PartialVolumeDescriptor) =>
  a && b && a.start === b.start && a.end === b.end && a.delta === b.delta;

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
    caseAttributesAreValid: true,
    labelsWithInvalidAttributes: []
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
    loadRevisions: (
      s,
      action: PayloadAction<{
        revisions: Revision<ExternalLabel>[];
        revisionIndex: number;
      }>
    ) => {
      const { revisions, revisionIndex } = action.payload;
      s.caseData!.revisions = revisions;
      s.editingRevisionIndex = revisionIndex;
      s.busy = true;
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
      const prev = s.history[s.currentHistoryIndex];
      const sameSeriesSet =
        prev &&
        prev.revision.series.every(
          (s, i) =>
            s.seriesUid === revision.series[i]?.seriesUid &&
            pvdEquals(
              s.partialVolumeDescriptor,
              revision.series[i]?.partialVolumeDescriptor
            )
        );

      const [layoutItems, layout] = sameSeriesSet
        ? [prev.layoutItems, prev.layout]
        : performLayout('twoByTwo', 0);

      const editingData: EditingData = {
        revision,
        activeSeriesIndex: 0,
        activeLabelIndex: (revision.series[0].labels || []).length > 0 ? 0 : -1,
        layout,
        layoutItems,
        activeLayoutKey: layoutItems[0].key,
        allLabelsHidden: false
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
    validateLabelAttributes: (
      s,
      action: PayloadAction<{ key: string; valid: boolean }>
    ) => {
      const { key, valid } = action.payload;
      s.labelsWithInvalidAttributes = s.labelsWithInvalidAttributes.filter(
        s => s !== key
      );
      if (!valid) {
        s.labelsWithInvalidAttributes.push(key);
      }
    }
  }
});

const reducer: (state: CaseDetailState, action: any) => CaseDetailState =
  slice.reducer;

export default reducer;

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
