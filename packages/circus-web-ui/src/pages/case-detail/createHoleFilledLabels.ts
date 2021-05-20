import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { InternalLabel } from './labelData';
import { EditingData, EditingDataUpdater } from './revisionData';
import { createNewLabelData } from './labelData';
import { OrientationString } from 'circus-rs/section-util';
import { TaggedLabelDataOf } from './labelData';
import produce from 'immer';
import { pixelFormatInfo } from '@utrad-ical/circus-lib/src/PixelFormat';
import * as rs from 'circus-rs';
import HoleFilling2D, {
  HoleFilling3D
} from '@utrad-ical/circus-rs/src/common/CCL/holeFilling';
import { alert } from '@smikitky/rb-components/lib/modal';

const createHoleFilledLabels = async (
  editingData: EditingData,
  updateEditingData: EditingDataUpdater,
  viewers: { [index: string]: Viewer },
  label: InternalLabel,
  labelColors: string[],
  dimension3: boolean,
  holeFillingOrientation: string,
  neighbors4or6: boolean
) => {
  if (label.type !== 'voxel' || !label.data.size)
    throw new TypeError('Invalid label passed.');

  const createNewLabel = (
    viewer: Viewer,
    color: string,
    name: string
  ): InternalLabel => {
    const alpha = 1;
    const temporaryKey = generateUniqueId();
    const data = createNewLabelData('voxel', { color, alpha }, viewer);
    return { temporaryKey, name, ...data, attributes: {}, hidden: false };
  };

  const basic: OrientationString[] = ['axial', 'sagittal', 'coronal'];
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
  if (basic.indexOf(orientation) < 0) {
    await alert(
      'The orientation of the selected viewer must be ' +
        basic.join(' or ') +
        '.'
    );
    return;
  }
  // Small wrapper around updateEditingData
  const updateCurrentLabels = (
    updater: (labels: TaggedLabelDataOf<'voxel'>) => void
  ) => {
    const labels =
      editingData.revision.series[editingData.activeSeriesIndex].labels;
    const newLabels = produce(labels, updater);
    updateEditingData(editingData => {
      editingData.revision.series[
        editingData.activeSeriesIndex
      ].labels = newLabels;
    });
  };
  const pxInfo = pixelFormatInfo('binary');
  const img = new pxInfo.arrayClass(label.data.volumeArrayBuffer);
  const [width, height, nSlices] = label.data.size;
  const color =
    labelColors[
      (labelColors.indexOf(label.data.color) + 1) % labelColors.length
    ];

  const input = new Uint8Array(width * height * nSlices);
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos0 = i + j * width + k * width * height;
        const pos =
          holeFillingOrientation === 'Axial' || dimension3
            ? i + j * width + k * width * height
            : holeFillingOrientation === 'Sagital'
            ? j + k * height + i * height * nSlices
            : k + i * nSlices + j * width * nSlices;
        if (((img[pos0 >> 3] >> (7 - (pos0 % 8))) & 1) === 1) {
          input[pos] = 1;
        }
      }
    }
  }
  try {
    const holeFillingResult = dimension3
      ? HoleFilling3D(input, width, height, nSlices, neighbors4or6 ? 6 : 26)
      : holeFillingOrientation === 'Axial'
      ? HoleFilling2D(input, width, height, nSlices, neighbors4or6 ? 4 : 8)
      : holeFillingOrientation === 'Sagital'
      ? HoleFilling2D(input, height, nSlices, width, neighbors4or6 ? 4 : 8)
      : HoleFilling2D(input, nSlices, width, height, neighbors4or6 ? 4 : 8);
    const volume = new rs.RawData([width, height, nSlices], 'binary');

    for (let k = 0; k <= nSlices; k++) {
      for (let j = 0; j <= height; j++) {
        for (let i = 0; i <= width; i++) {
          const pos = i + j * width + k * width * height;
          const pos0 =
            holeFillingOrientation === 'Axial' || dimension3
              ? i + j * width + k * width * height
              : holeFillingOrientation === 'Sagital'
              ? j + k * height + i * height * nSlices
              : k + i * nSlices + j * width * nSlices;
          if (holeFillingResult.result[pos0] > 0) {
            volume.write(1, pos);
          }
        }
      }
    }
    const newLabel = createNewLabel(
      viewers[viewerId],
      color,
      `${label.name}: ${dimension3 ? 3 : 2}D hole filling ${
        !dimension3 && '(' + holeFillingOrientation + ')'
      }`
    );
    newLabel.data.size = label.data.size;
    newLabel.data.origin = label.data.origin;
    newLabel.data.volumeArrayBuffer = volume.data;
    updateCurrentLabels(labels => {
      // labels.push(newLabel);
      labels.splice(editingData.activeLabelIndex + 1, 0, newLabel);
    });
  } catch (err) {
    console.log('error', err.message);
    alert(`${label.name} is too complex.\nPlease modify ${label.name}.`);
  }
};

export default createHoleFilledLabels;
