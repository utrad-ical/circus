import { Button, Modal } from 'components/react-bootstrap';
import SeriesSelector, { SeriesEntry } from 'components/SeriesSelector';
import produce from 'immer';
import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useApi } from 'utils/api';
import fillPartialVolumeDescriptors from 'utils/partialVolumeDescriptor';
import { SeriesEntryWithLabels } from './revisionData';

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
    const labelAdded: SeriesEntryWithLabels[] = produce(entries, entries => {
      entries.forEach(entry => {
        if (!('labels' in entry)) (entry as any).labels = [];
      });
      return entries as SeriesEntryWithLabels[];
    });
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
      <Modal.Header>Select Series</Modal.Header>
      <Modal.Body>
        <SeriesSelector
          value={entries}
          onChange={setEntries}
          alwaysShowRelevantSeries
          onRemoving={handleRemovingOrEditing}
          onPvdEditing={handleRemovingOrEditing}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={() => onResolve(null)}>
          Cancel
        </Button>
        <Button onClick={handleResolve} bsStyle="primary">
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SeriesSelectorDialog;
