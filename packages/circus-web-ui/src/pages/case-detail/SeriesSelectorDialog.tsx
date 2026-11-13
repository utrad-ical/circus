import Button from '#components/Button.tsx';
import { DialogBody, DialogFooter, DialogHeader } from '#components/Dialog.tsx';
import type { SeriesEntry } from '#components/SeriesSelector.tsx';
import SeriesSelector from '#components/SeriesSelector.tsx';
import { produce } from 'immer';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useApi } from '#utils/api.ts';
import fillPartialVolumeDescriptors from '#utils/partialVolumeDescriptor.ts';
import type { SeriesEntryWithLabels } from './revisionData.ts';

const SeriesSelectorDialog: React.FC<{
  onResolve: (result: SeriesEntryWithLabels[] | null) => void;
  initialValue: SeriesEntryWithLabels[];
}> = props => {
  const { onResolve, initialValue } = props;
  const [entries, setEntries] = useState<SeriesEntry[]>(initialValue);
  const api = useApi();
  const appState = useSelector(state => state);

  const handleRemovingOrEditing = async (index: number) => {
    if ((entries[index] as SeriesEntryWithLabels).labels?.length) {
      alert(
        'You cannot edit or remove a series while it has one or more labels.'
      );
      return false;
    }
    return true;
  };

  const handleResolve = async () => {
    // Fill label arrays
    const labelAdded: SeriesEntryWithLabels[] = produce(
      entries as SeriesEntryWithLabels[],
      entries => {
        entries.forEach(entry => {
          if (!('labels' in entry)) (entry as any).labels = [];
        });
        return entries as SeriesEntryWithLabels[];
      }
    );
    // fill empty PVDs
    const pvdFilled = (await fillPartialVolumeDescriptors(
      labelAdded,
      api,
      appState
    )) as SeriesEntryWithLabels[];
    onResolve(pvdFilled);
  };

  return (
    <>
      <DialogHeader>Select Series</DialogHeader>
      <DialogBody>
        <SeriesSelector
          value={entries}
          onChange={setEntries}
          alwaysShowRelevantSeries
          onRemoving={handleRemovingOrEditing}
          onPvdEditing={handleRemovingOrEditing}
        />
      </DialogBody>
      <DialogFooter>
        <Button variant="link" onClick={() => onResolve(null)}>
          Cancel
        </Button>
        <Button onClick={handleResolve} variant="primary">
          OK
        </Button>
      </DialogFooter>
    </>
  );
};

export default SeriesSelectorDialog;
