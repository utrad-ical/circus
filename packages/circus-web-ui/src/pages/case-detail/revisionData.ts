import type {
  CaseRevision,
  CaseRevisionCreate
} from '@utrad-ical/circus-api-schema';
import type { LayoutInfo } from '#components/GridContainer.tsx';
import { api } from '#utils/api.ts';
import asyncMap from '../../utils/asyncMap.ts';
import type { InternalLabel } from './labelData.ts';
import {
  externalLabelToInternal,
  internalLabelToExternal
} from './labelData.ts';
import type { ViewerDef } from './ViewerGrid.tsx';

/**
 * EditingData represents one revision data with some meta data,
 * and forms the unit for history handling.
 */
export interface EditingData {
  revision: Revision;
  /**
   * The index of the active series. Always >= 0.
   */
  activeSeriesIndex: number;
  /**
   * The index of the active label in the active series.
   * May be `-1`, which means the current series has no label.
   */
  activeLabelIndex: number;
  /**
   * Holds the viewer grid layout.
   */
  layout: LayoutInfo;
  /**
   * Holds the list of layoutable items passed to the grid container.
   */
  layoutItems: ViewerDef[];
  activeLayoutKey: string | null;
  /**
   * Holds the "all labels hidden" status.
   */
  allLabelsHidden: boolean;
}

/**
 * Immer-backed update function used to modify the current EditingData.
 * @param updater The updater function that takes the 'draft' state.
 * @param tag Used for history handling. If similar small operations happen
 * many times, giving the same string as a tag will make them coalesce.
 * Don't give tags for important operations that can be undone individually.
 */
export type EditingDataUpdater = (
  updater: (current: EditingData) => EditingData | void,
  tag?: string
) => void;

/**
 * Immer-backed initialize function used to set the EditingData layout.
 * @param initializer The initializer function that takes the 'draft' state.
 */
export type EditingDataLayoutInitializer = (
  initializer: (current: {
    layoutItems: ViewerDef[];
    layout: LayoutInfo;
    activeLayoutKey: string | null;
  }) => {
    layoutItems: ViewerDef[];
    layout: LayoutInfo;
    activeLayoutKey: string | null;
  } | void
) => void;

export type Revision = Omit<CaseRevision, 'series'> & {
  series: SeriesEntryWithLabels[];
};

export type SeriesEntryWithLabels = Omit<
  CaseRevision['series'][number],
  'labels'
> & {
  labels: InternalLabel[];
};

/**
 * Takes the revision data fetched from the API server and converts them
 * to the internal representation with temporary keys and array buffers.
 */
export const externalRevisionToInternal = async (
  revision: CaseRevision
): Promise<Revision> => ({
  ...revision,
  series: await asyncMap(revision.series, async series => ({
    ...series,
    labels: await asyncMap(series.labels, externalLabelToInternal)
  }))
});

/**
 * Saves a new revision data on the API server.
 */
export const saveRevision = async (
  caseId: string,
  revision: Revision,
  description: string
) => {
  const saveData: CaseRevisionCreate = {
    description,
    attributes: revision.attributes,
    series: await asyncMap(revision.series, async series => ({
      ...series,
      labels: await asyncMap(series.labels, internalLabelToExternal)
    })),
    status: 'approved'
  };

  await api<unknown, CaseRevisionCreate>(`cases/${caseId}/revision`, {
    method: 'post',
    data: saveData
  });
};

export const seriesColors = [
  '#ff0000',
  '#00aaff',
  '#00ff00',
  '#dddd00',
  '#dd00dd',
  '#0000ff'
];
