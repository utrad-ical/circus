import { EditingData, EditingDataUpdater } from './revisionData';
import { InternalLabel } from './labelData';
import produce from 'immer';
// Small wrapper around updateEditingData
const createCurrentLabelsUpdator = (
  editingData: EditingData,
  updateEditingData: EditingDataUpdater
) => {
  return (updater: (labels: InternalLabel[]) => void) => {
    const labels =
      editingData.revision.series[editingData.activeSeriesIndex].labels;
    const newLabels = produce(labels, updater);
    updateEditingData(editingData => {
      editingData.revision.series[editingData.activeSeriesIndex].labels =
        newLabels;
    });
  };
};

export default createCurrentLabelsUpdator;
