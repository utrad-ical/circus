import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';
import RawData from '@utrad-ical/circus-rs/src/common/RawData';
import createCurrentLabelsUpdator from './createCurrentLabelsUpdator';
import { createNewLabelData, InternalLabelOf } from './labelData';
import { EditingData, EditingDataUpdater } from './revisionData';

export type PostProcessor = (results: {
  labelingResults: LabelingResults3D;
  names: string[];
}) => void;

export type VoxelLabelProcessor = (
  input: Uint8Array,
  width: number,
  height: number,
  nSlices: number,
  name: string,
  postProcessor: PostProcessor,
  handleProgress: (progress: { value: number; label: string }) => void
) => void;

const performLabelCreatingVoxelProcessing = async (
  editingData: EditingData,
  updateEditingData: EditingDataUpdater,
  label: InternalLabelOf<'voxel'>,
  labelColors: string[],
  voxelLabelProcessor: VoxelLabelProcessor,
  reportProgress: (progress: { value: number; label: string }) => void
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

  const updateCurrentLabels = createCurrentLabelsUpdator(
    editingData,
    updateEditingData
  );

  const [width, height, nSlices] = label.data.size;
  const img = new RawData([width, height, nSlices], 'binary');
  img.assign(label.data.volumeArrayBuffer!);
  img.convert('uint8', (v: number) => {
    return v === 1 ? 1 : 0;
  });
  const addNewLabels: PostProcessor = results => {
    const { labelingResults, names } = results;
    const newLabel: InternalLabelOf<'voxel'>[] = [];
    for (let num = 0; num < labelingResults.labelNum; num++) {
      const [ULx, ULy, ULz] = labelingResults.labels[num].min;
      const [LRx, LRy, LRz] = labelingResults.labels[num].max;
      const color =
        labelColors[
          (labelColors.indexOf(label.data.color) + num + 1) % labelColors.length
        ];
      newLabel.push(createNewLabel(color, names[num]));
      const [sizex, sizey, sizez] = [
        LRx - ULx + 1,
        LRy - ULy + 1,
        LRz - ULz + 1
      ];

      newLabel[num].data.size = [sizex, sizey, sizez];
      const volume = new rs.RawData([sizex, sizey, sizez], 'binary');

      for (let k = ULz; k <= LRz; k++) {
        for (let j = ULy; j <= LRy; j++) {
          for (let i = ULx; i <= LRx; i++) {
            const pos = i + j * width + k * width * height;
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
  reportProgress({ value: 100, label: '' });
  voxelLabelProcessor(
    new Uint8Array(img.data),
    width,
    height,
    nSlices,
    label.name!,
    addNewLabels,
    reportProgress
  );
};

export default performLabelCreatingVoxelProcessing;
