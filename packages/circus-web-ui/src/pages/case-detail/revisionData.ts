import { PartialVolumeDescriptor } from '@utrad-ical/circus-lib';
import { LayoutInfo } from 'components/GridContainer';
import { createDraft, finishDraft } from 'immer';
import { ApiCaller } from 'utils/api';
import asyncMap from '../../utils/asyncMap';
import {
  ExternalLabel,
  externalLabelToInternal,
  InternalLabel,
  internalLabelToExternal
} from './labelData';
import { ViewerDef } from './ViewerGrid';

/**
 * EditingData represents one revision data with some meta data,
 * and forms the unit for history handling.
 */
export interface EditingData {
  revision: Revision<InternalLabel>;
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

export interface Revision<
  L extends InternalLabel | ExternalLabel = InternalLabel
> {
  creator: string;
  date: string;
  description: string;
  attributes: object;
  series: SeriesEntryWithLabels<L>[];
  status: string;
}

export interface SeriesEntryWithLabels<
  L extends InternalLabel | ExternalLabel = InternalLabel
> {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
  labels: L[];
}

/**
 * Takes the revision data fetched from the API server and converts them
 * to the internal representation with temporary keys and array buffers.
 */
export const externalRevisionToInternal = async (
  revision: Revision<ExternalLabel>,
  api: ApiCaller
): Promise<Revision<InternalLabel>> => {
  const draft = createDraft(revision);
  for (const series of draft.series) {
    (series as any).labels = await asyncMap(series.labels, label =>
      externalLabelToInternal(label, api)
    );
  }

  return finishDraft(draft) as Revision<InternalLabel>;
};

const internalSeriesToExternal = async (
  series: SeriesEntryWithLabels<InternalLabel>,
  api: ApiCaller
): Promise<SeriesEntryWithLabels<ExternalLabel>> => {
  const newLabels = await asyncMap(series.labels, async label =>
    internalLabelToExternal(label, api)
  );

  const draft = createDraft(series);
  draft.labels = newLabels as any;
  return finishDraft(draft) as SeriesEntryWithLabels<ExternalLabel>;
};

/**
 * Saves a new revision data on the API server.
 */
export const saveRevision = async (
  caseId: string,
  revision: Revision,
  description: string,
  api: ApiCaller
) => {
  const saveData: Partial<Revision<ExternalLabel>> = {
    description,
    attributes: revision.attributes,
    series: await asyncMap(revision.series, async series =>
      internalSeriesToExternal(series, api)
    ),
    status: 'approved'
  };

  await api(`cases/${caseId}/revision`, {
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
