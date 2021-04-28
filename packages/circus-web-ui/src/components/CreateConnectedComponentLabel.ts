import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { InternalLabel } from '../pages/case-detail/labelData';
import {
  EditingData,
  EditingDataUpdater
} from '../pages/case-detail/revisionData';
import { createNewLabelData } from '../pages/case-detail/labelData';
import { OrientationString } from 'circus-rs/section-util';
import { TaggedLabelDataOf } from '../pages/case-detail/labelData';
import produce from 'immer';
import { pixelFormatInfo } from '@utrad-ical/circus-lib/src/PixelFormat';
import * as rs from 'circus-rs';
import CCL6 from '../../../circus-rs/src/common/CCL/ConnectedComponentLabeling3D6';
import CCL26 from '../../../circus-rs/src/common/CCL/ConnectedComponentLabeling3D26';

const CreateConnectedComponentLabel = async (
  editingData: EditingData,
  updateEditingData: EditingDataUpdater,
  viewers: { [index: string]: Viewer },
  label: InternalLabel,
  labelColors: string[],
  dispLabelNumber: number,
  neighbors: 6 | 26
) => {
  const createNewLabel = (
    viewer: Viewer,
    color: string,
    name: string
  ): InternalLabel => {
    const alpha = 1;
    const temporaryKey = generateUniqueId();
    console.log(name, temporaryKey);
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

  const input = new Uint8Array(width * height * nSlices);
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos = i + j * width + k * width * height;
        if (((img[pos >> 3] >> (7 - (pos % 8))) & 1) === 1) {
          input[pos] = 1;
        }
      }
    }
  }
  console.log('準備完了', input, width, height, nSlices);
  try {
    const labelingResults =
      neighbors === 6
        ? CCL6(input, width, height, nSlices)
        : CCL26(input, width, height, nSlices);
    console.log('CCL完了');
    const newLabel: InternalLabel[] = [];
    const order = [...Array(labelingResults.labelNum)].map((_, i) => i + 1);
    const name = [
      'largest',
      '2nd largest',
      '3rd largest',
      '4th largest',
      '5th largest',
      '6th largest',
      '7th largest',
      '8th largest',
      '9th largest',
      '10th largest',
      'rest'
    ];
    order.sort((a, b) => {
      return (
        labelingResults.labels[b].volume - labelingResults.labels[a].volume
      );
    });
    for (let num = dispLabelNumber + 1; num < labelingResults.labelNum; num++) {
      for (let i = 0; i < 3; i++) {
        if (
          labelingResults.labels[order[num]].min[i] <
          labelingResults.labels[order[dispLabelNumber]].min[i]
        ) {
          labelingResults.labels[order[dispLabelNumber]].min[i] =
            labelingResults.labels[order[num]].min[i];
        }
        if (
          labelingResults.labels[order[dispLabelNumber]].max[i] <
          labelingResults.labels[order[num]].max[i]
        ) {
          labelingResults.labels[order[dispLabelNumber]].max[i] =
            labelingResults.labels[order[num]].max[i];
        }
      }
      labelingResults.labels[order[dispLabelNumber]].volume +=
        labelingResults.labels[order[num]].volume;
      for (
        let k = labelingResults.labels[order[num]].min[2];
        k <= labelingResults.labels[order[num]].max[2];
        k++
      ) {
        for (
          let j = labelingResults.labels[order[num]].min[1];
          j <= labelingResults.labels[order[num]].max[1];
          j++
        ) {
          for (
            let i = labelingResults.labels[order[num]].min[0];
            i <= labelingResults.labels[order[num]].max[0];
            i++
          ) {
            const pos = i + j * width + k * width * height;
            if (labelingResults.labelMap[pos] === order[num]) {
              labelingResults.labelMap[pos] = order[dispLabelNumber];
            }
          }
        }
      }
    }

    console.log(label.data.color, labelColors.indexOf(label.data.color));
    const maxI = Math.min(dispLabelNumber, labelingResults.labelNum - 1);
    for (let i = 0; i <= maxI; i++) {
      const num = order[i];
      const [ULx, ULy, ULz] = labelingResults.labels[num].min;
      const [LRx, LRy, LRz] = labelingResults.labels[num].max;
      console.log(ULx, ULy, ULz, LRx, LRy, LRz);
      const color =
        labelColors[
          (labelColors.indexOf(label.data.color) + i + 1) % labelColors.length
        ];
      const flag = i === maxI && maxI < labelingResults.labelNum - 1;
      newLabel.push(
        createNewLabel(
          viewers[viewerId],
          color,
          `${label.name}: the ${flag ? name[10] : name[i]} CCLs`
        )
      );
      const [sizex, sizey, sizez] =
        (LRx - ULx + 1) * (LRy - ULy + 1) * (LRz - ULz + 1) >= 8
          ? [LRx - ULx + 1, LRy - ULy + 1, LRz - ULz + 1]
          : [8, 8, 8];
      newLabel[i].data.size = [sizex, sizey, sizez];
      const volume = new rs.RawData([sizex, sizey, sizez], 'binary');

      for (let k = ULz; k <= LRz; k++) {
        for (let j = ULy; j <= LRy; j++) {
          for (let i = ULx; i <= LRx; i++) {
            const pos = i + j * width + k * width * height;
            const volume_pos =
              i - ULx + (j - ULy) * sizex + (k - ULz) * sizex * sizey;
            if (labelingResults.labelMap[pos] === num) {
              volume.write(1, volume_pos);
            }
          }
        }
      }
      newLabel[i].data.volumeArrayBuffer = volume.data;
      newLabel[i].data.origin = [
        ULx + label.data.origin[0],
        ULy + label.data.origin[1],
        ULz + label.data.origin[2]
      ];
    }
    updateCurrentLabels(labels => {
      // labels.push(...newLabel);
      labels.splice(editingData.activeLabelIndex + 1, 0, ...newLabel);
    });
  } catch (err) {
    console.log('error', err.message);
    alert(`${label.name} is too complex.\nPlease modify ${label.name}.`);
  }
};

export default CreateConnectedComponentLabel;
