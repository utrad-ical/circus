import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import { EditingData, EditingDataUpdater } from './revisionData';
import { createNewLabelData } from './labelData';
import { InternalLabelOf } from './labelData';
import { pixelFormatInfo } from '@utrad-ical/circus-lib/src/PixelFormat';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import updateEditingDataWrapper from './updateEditingDataWrapper';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';

const createNewLabels = async (
  editingData: EditingData,
  updateEditingData: EditingDataUpdater,
  label: InternalLabelOf<'voxel'>,
  labelColors: string[],
  orientation: 'Axial' | 'Coronal' | 'Sagital' | null,
  dimension3: boolean,
  imageProcessor: (
    input: Uint8Array,
    width: number,
    height: number,
    nSlices: number,
    name: string
  ) => Promise<{ labelingResults: LabelingResults3D; names: string[] }>
) => {
  if (label.type !== 'voxel' || !label.data.size)
    throw new TypeError('Invalid label passed.');

  const createNewLabel = (
    color: string,
    name: string
  ): InternalLabelOf<'voxel'> => {
    const alpha = 1;
    const temporaryKey = generateUniqueId();
    const data = createNewLabelData('voxel', { color, alpha });
    return { temporaryKey, name, ...data, attributes: {}, hidden: false };
  };

  const updateCurrentLabels = updateEditingDataWrapper(
    editingData,
    updateEditingData
  );

  const pxInfo = pixelFormatInfo('binary');
  const img = new pxInfo.arrayClass(label.data.volumeArrayBuffer);
  const [width, height, nSlices] = label.data.size;
  const input = new Uint8Array(width * height * nSlices);
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos0 = i + j * width + k * width * height;
        const pos =
          orientation === 'Axial' || dimension3
            ? i + j * width + k * width * height
            : orientation === 'Sagital'
            ? j + k * height + i * height * nSlices
            : k + i * nSlices + j * width * nSlices;
        if (((img[pos0 >> 3] >> (7 - (pos0 % 8))) & 1) === 1) {
          input[pos] = 1;
        }
      }
    }
  }
  const result = imageProcessor(input, width, height, nSlices, label.name!);

  const { labelingResults, names } = await result;

  if (labelingResults.labelNum === 0) {
    return;
  }

  const newLabel: InternalLabelOf<'voxel'>[] = [];
  for (let num = 0; num < labelingResults.labelNum; num++) {
    const [ULx, ULy, ULz] = labelingResults.labels[num].min;
    const [LRx, LRy, LRz] = labelingResults.labels[num].max;
    const color =
      labelColors[
        (labelColors.indexOf(label.data.color) + num + 1) % labelColors.length
      ];
    newLabel.push(createNewLabel(color, names[num]));
    const [sizex, sizey, sizez] =
      (LRx - ULx + 1) * (LRy - ULy + 1) * (LRz - ULz + 1) >= 8 ** 3
        ? [LRx - ULx + 1, LRy - ULy + 1, LRz - ULz + 1]
        : [8, 8, 8];
    newLabel[num].data.size = [sizex, sizey, sizez];
    const volume = new rs.RawData([sizex, sizey, sizez], 'binary');

    for (let k = ULz; k <= LRz; k++) {
      for (let j = ULy; j <= LRy; j++) {
        for (let i = ULx; i <= LRx; i++) {
          const pos =
            orientation === 'Axial' || dimension3
              ? i + j * width + k * width * height
              : orientation === 'Sagital'
              ? j + k * height + i * height * nSlices
              : k + i * nSlices + j * width * nSlices;
          if (labelingResults.labelMap[pos] === num + 1) {
            volume.writePixelAt(1, i - ULx, j - ULy, k - ULz);
          }
        }
      }
    }
    newLabel[num].data.volumeArrayBuffer = volume.data;
    newLabel[num].data.origin = [
      ULx + label.data.origin![0],
      ULy + label.data.origin![1],
      ULz + label.data.origin![2]
    ];
  }
  updateCurrentLabels(labels => {
    labels.splice(editingData.activeLabelIndex + 1, 0, ...newLabel);
  });
};

export default createNewLabels;
