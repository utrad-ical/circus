import { Viewer } from '@utrad-ical/circus-rs/src/browser';
import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { InternalLabel, LabelType } from '../pages/case-detail/labelData';
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
import CCL from '../../../circus-rs/src/common/CCL/ConnectedComponentLabeling3D26';

const labelColors = [
  '#ff0000',
  '#00ff00',
  '#ffff00',
  '#0000ff',
  '#ff00ff',
  '#00ffff',
  '#ff4400',
  '#ff0044',
  '#88ff00',
  '#afc6fc',
  '#ff5e6e',
  '#aa4433',
  '#ff8888',
  '#ffff88',
  '#aaffaa',
  '#ff88ff'
];

const CreateConnectedComponentLabel = async (
  editingData: EditingData,
  updateEditingData: EditingDataUpdater,
  viewers: { [index: string]: Viewer },
  label: InternalLabel
) => {
  const createNewLabel = (viewer: Viewer, color: string, name: string): InternalLabel => {
    const alpha = 1;
    const temporaryKey = generateUniqueId();
    console.log(name, temporaryKey);
    const data = createNewLabelData('voxel', { color, alpha }, viewer);
    return { temporaryKey, name, ...data, attributes: {}, hidden: false };
  };

  const getUniqueLabelName = (name: string) => {
    console.log(
      'editingData.activeSeriesIndex',
      editingData.activeSeriesIndex,
      editingData.revision.series[editingData.activeSeriesIndex].labels
    );
    const nameExists = (name: string) =>
      editingData.revision.series[editingData.activeSeriesIndex].labels.some(
        label => label.name === name
      );
    if (!nameExists(name)) return name;
    for (let index = 2; ; index++) {
      const newName = name + ' ' + index;
      if (!nameExists(newName)) return newName;
    }
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
  const labelingResults = CCL(input, width, height, nSlices);
  console.log('CCL完了');
  const newLabel: InternalLabel[] = [];
  const order = [...Array(labelingResults.labelNum)].map((_, i) => i + 1);
  const dispLabelNumber = 8;
  const name = ["largest", "2nd largest", "3rd largest", "4th largest", "5th largest", "6th largest", "7th largest", "rest"];
  order.sort((a, b) => {
    return labelingResults.labels[b].volume - labelingResults.labels[a].volume;
  });

  for (let num = dispLabelNumber; num < labelingResults.labelNum; num++) {
    for (let i = 0; i < 3; i++){
      if (labelingResults.labels[order[num]].min[i] < labelingResults.labels[order[dispLabelNumber - 1]].min[i]) {
        labelingResults.labels[order[dispLabelNumber - 1]].min[i] = labelingResults.labels[order[num]].min[i];
      }
      if (labelingResults.labels[order[dispLabelNumber - 1]].max[i] < labelingResults.labels[order[num]].max[i]) {
        labelingResults.labels[order[dispLabelNumber - 1]].max[i] = labelingResults.labels[order[num]].max[i];
      }
    }
    labelingResults.labels[order[dispLabelNumber - 1]].volume += labelingResults.labels[order[num]].volume
    for (let k = labelingResults.labels[order[num]].min[2]; k <= labelingResults.labels[order[num]].max[2]; k++) {
      for (let j = labelingResults.labels[order[num]].min[1]; j <= labelingResults.labels[order[num]].max[1]; j++) {
        for (let i = labelingResults.labels[order[num]].min[0]; i <= labelingResults.labels[order[num]].max[0]; i++) {
          const pos = i + j * width + k * width * height;
          if (labelingResults.labelMap[pos] === order[num]) {
            labelingResults.labelMap[pos] = order[dispLabelNumber - 1];
          }
        }
      }
    }
  }
  

  console.log(order)
  for (let i = 0; i < Math.min(dispLabelNumber, labelingResults.labelNum); i++) {
    const num = order[i];
    const [ULx, ULy, ULz] = labelingResults.labels[num].min;
    const [LRx, LRy, LRz] = labelingResults.labels[num].max;
    console.log(ULx, ULy, ULz, LRx, LRy, LRz);
    const hue = 360 / (Math.min(dispLabelNumber, labelingResults.labelNum) + 1) * (i + 1);
    let [R, G, B] = [0, 0, 0];
    if (hue < 60) {
      R = 255;
      G = (hue / 60) * (R - B) + B
    } else if (hue < 120) {
      G = 255;
      R = ((120 - hue) / 60) * (G - B) + B
    } else if (hue < 180) {
      G = 255;
      B = ((hue - 120) / 60) * (G - R) + R
    } else if (hue < 240) {
      B = 255;
      G = ((240 - hue) / 60) * (B - R) + R
    } else if (hue < 300) {
      B = 255;
      R = ((hue - 240) / 60) * (B - G) + G
    } else if (hue < 360) {
      R = 255;
      B = ((360 - hue) / 60) * (R - G) + G
    }
    const cov16 = (n: number) => {
      const sin = "0123456789abcdef";
      if(n>255)return 'ff';
      if(n<0) return '00';
      return sin.charAt(Math.floor(n/16))+sin.charAt(n%16);
    }
    newLabel.push(createNewLabel(viewers[viewerId], `#${cov16(R)}${cov16(G)}${cov16(B)}`, `${label.name}: the ${name[i]} CCLs`));
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
    labels.push(...newLabel);
  });
};

export default CreateConnectedComponentLabel;
