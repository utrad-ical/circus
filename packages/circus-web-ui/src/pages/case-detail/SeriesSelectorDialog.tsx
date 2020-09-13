import { Button, Modal } from 'components/react-bootstrap';
import SeriesSelector from 'components/SeriesSelector';
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
  const [entries, setEntries] = useState<SeriesEntryWithLabels[]>(initialValue);
  const api = useApi();
  const appState = useSelector(state => state);

  const handleRemovingOrEditing = async (index: number) => {
    if (entries[index].labels?.length) {
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
        if (!entry.labels) entry.labels = [];
      });
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
      <Modal.Body>
        <p>Select Series</p>
        <SeriesSelector
          value={entries}
          onChange={setEntries}
          alwaysShowRelevaltSeries
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
