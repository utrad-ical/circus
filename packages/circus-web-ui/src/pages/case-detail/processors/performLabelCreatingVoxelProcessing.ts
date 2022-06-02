import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import * as rs from '@utrad-ical/circus-rs/src/browser';
import { LabelingResults3D } from '@utrad-ical/circus-rs/src/common/CCL/ccl-types';
import { MorphologicalImageProcessingResults } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';
import RawData from '@utrad-ical/circus-rs/src/common/RawData';
import createCurrentLabelsUpdator from '../createCurrentLabelsUpdator';
import { createNewLabelData, InternalLabelOf } from '../labelData';
import { ProcessorProgress, Processor } from './processor-types';

export type PostProcessor<
  T extends LabelingResults3D | MorphologicalImageProcessingResults
> = (results: { processingResults: T; names: string[] }) => void;

export type VoxelLabelProcessor<
  T extends LabelingResults3D | MorphologicalImageProcessingResults,
  O
> = (props: {
  options: O;
  input: Uint8Array;
  width: number;
  height: number;
  nSlices: number;
  name: string;
  postProcessor: PostProcessor<T>;
  reportProgress: (progress: ProcessorProgress) => void;
}) => void;

const performLabelCreatingVoxelProcessing = <
  T extends LabelingResults3D | MorphologicalImageProcessingResults,
  O
>(
  voxelLabelProcessor: VoxelLabelProcessor<T, O>
): Processor<O> => {
  return async (options, input) => {
    const {
      editingData,
      updateEditingData,
      selectedLabel: label,
      hints: { labelColors },
      reportProgress
    } = input;
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

    const addNewLabels: PostProcessor<T> = results => {
      const { processingResults, names } = results;
      const newLabel: InternalLabelOf<'voxel'>[] = [];

      if ('labelNum' in processingResults) {
        for (let num = 0; num < processingResults.labelNum; num++) {
          const [ULx, ULy, ULz] = processingResults.labels[num].min;
          const [LRx, LRy, LRz] = processingResults.labels[num].max;
          const color =
            labelColors[
              (labelColors.indexOf(label.data.color) + num + 1) %
                labelColors.length
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
                if (processingResults.labelMap[pos] === num + 1) {
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
      } else {
        const UL = processingResults.min;
        const LR = processingResults.max;
        const color =
          labelColors[
            (labelColors.indexOf(label.data.color) + 1) % labelColors.length
          ];
        newLabel.push(createNewLabel(color, names[0]));
        const [sizex, sizey, sizez] = LR.map(
          (lr: number, i: number) => lr - UL[i] + 1
        );
        newLabel[0].data.size = [sizex, sizey, sizez];
        const volume = new rs.RawData([sizex, sizey, sizez], 'binary');
        for (let k = 0; k < sizez; k++) {
          for (let j = 0; j < sizey; j++) {
            for (let i = 0; i < sizex; i++) {
              const pos = i + j * sizex + k * sizex * sizey;
              if (processingResults.result[pos]) {
                volume.writePixelAt(1, i, j, k);
              }
            }
          }
        }
        newLabel[0].data.volumeArrayBuffer = volume.data;
        newLabel[0].data.origin = [
          UL[0] + label.data.origin![0],
          UL[1] + label.data.origin![1],
          UL[2] + label.data.origin![2]
        ];
      }
      updateCurrentLabels(labels => {
        labels.splice(editingData.activeLabelIndex + 1, 0, ...newLabel);
      });
    };

    reportProgress({ value: 100, label: '', finished: false });
    voxelLabelProcessor({
      options,
      input: new Uint8Array(img.data),
      width: width,
      height: height,
      nSlices: nSlices,
      name: label.name!,
      postProcessor: addNewLabels,
      reportProgress
    });
  };
};

export default performLabelCreatingVoxelProcessing;
