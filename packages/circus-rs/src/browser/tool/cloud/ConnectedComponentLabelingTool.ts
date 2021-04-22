import CCL3D from '../../../common/CCL/ConnectedComponentLabeling3D6';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import {
    InternalLabel,
    createNewLabelData
  } from '../../../../../circus-web-ui/src/pages/case-detail/labelData';
import { EditingData, EditingDataUpdater } from '../../../../../circus-web-ui/src/pages/case-detail/revisionData';
import { Viewer } from '../../../browser';
import produce from 'immer';

/**
 * ConnectedComponentLabelingTool is a tool with which one can split VoxelCloud annotation by connected component.
 */

const ConnectedComponentLabelingTool = (editingData: EditingData, viewers: { [index: string]: Viewer }, updateEditingData: EditingDataUpdater) => {
  const { revision, activeLabelIndex, activeSeriesIndex } = editingData;
  const activeSeries = revision.series[activeSeriesIndex];

  const getUniqueLabelName = (name: string) => {
    const nameExists = (name: string) =>
      activeSeries.labels.some(label => label.name === name);
    if (!nameExists(name)) return name;
    for (let index = 2; ; index++) {
      const newName = name + ' ' + index;
      if (!nameExists(newName)) return newName;
    }
  };

  const createNewLabel = (
      viewer: Viewer | undefined
    ): InternalLabel => {
      const color = '#ff0000';
      const alpha = 1;
      const temporaryKey = generateUniqueId();
      const name = getUniqueLabelName('Voxels');
      const data = createNewLabelData("voxel", { color, alpha }, viewer);
      return { temporaryKey, name, ...data, attributes: {}, hidden: false };
    };
  // Small wrapper around updateEditingData
  const updateCurrentLabels = (updater: (labels: InternalLabel[]) => void) => {
    const labels = editingData.revision.series[activeSeriesIndex].labels;
    const newLabels = produce(labels, updater);
    updateEditingData(editingData => {
      editingData.revision.series[activeSeriesIndex].labels = newLabels;
    });
  };
    
    const addLabel = async () => {  
      const allowedOrientations = { voxel: ['axial', 'sagittal', 'coronal'] };
    
      const viewerId = editingData.activeLayoutKey;
  
      if (!viewerId) {
        await alert(
          'Select the viewer on which you want to place the new label. ' +
            'Click the header.'
        );
        return;
      }
    
      const orientation = editingData.layoutItems.find(
        item => item.key === viewerId
      )!.orientation;
      if (allowedOrientations["voxel"].indexOf(orientation) < 0) {
        await alert(
          'The orientation of the selected viewer must be ' +
            allowedOrientations["voxel"].join(' or ') +
            '.'
        );
        return;
      }
      console.log("viewerId",activeSeries.labels[activeLabelIndex].data.volumeArrayBuffer)
      
      const newLabel = createNewLabel(viewers[viewerId]);
      console.log("newLabel", newLabel)
      updateCurrentLabels(labels => {
        labels.push(newLabel)
      });
    };
  addLabel();
  console.log("ConnectedComponentLabelingTool")
}

export default ConnectedComponentLabelingTool