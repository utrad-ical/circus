import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import RawData from '@utrad-ical/circus-rs/src/common/RawData';
import createCurrentLabelsUpdator from '../createCurrentLabelsUpdator';
import {
  createNewLabelData,
  InternalLabel,
  InternalLabelOf
} from '../labelData';
import { Processor, ProcessorProgress } from './processor-types';
import boWorker from 'worker-loader!./bo-worker';

export const booleanOperationTypes = ['add', 'subtract', 'intersect'] as const;
export type BooleanOperationType = (typeof booleanOperationTypes)[number];

export interface BooleanOperationsOptions {
  operation: BooleanOperationType;
  targetLabelIndex: number;
}

export type LabelProcessor = (props: {
  options: BooleanOperationsOptions;
  reportProgress: (progress: ProcessorProgress) => void;
}) => void;

const booleanOperationsProcessor: Processor<BooleanOperationsOptions> = (
  options,
  input
) => {
  const {
    editingData,
    updateEditingData,
    selectedLabel: label,
    hints: { labelColors, initialAlpha },
    reportProgress
  } = input;
  if (label.type !== 'voxel' || !label.data.size || !label.data.origin)
    throw new TypeError('Invalid label passed.');

  const { operation, targetLabelIndex } = options;
  if (targetLabelIndex < 0) return;

  const targetLabel =
    editingData.revision.series[editingData.activeSeriesIndex].labels[
      targetLabelIndex
    ];
  if (
    targetLabel.type !== 'voxel' ||
    !targetLabel.data.size ||
    !targetLabel.data.origin
  )
    throw new TypeError('Invalid label passed.');

  reportProgress({ value: 100, label: '', finished: false });
  const updateCurrentLabels = createCurrentLabelsUpdator(
    editingData,
    updateEditingData
  );

  const color =
    labelColors[
      Math.max(
        labelColors.indexOf(label.data.color) + 1,
        labelColors.indexOf(targetLabel.data.color) + 1
      ) % labelColors.length
    ];

  if (window.Worker) {
    const myWorker = new boWorker();
    myWorker.postMessage({
      label,
      targetLabel,
      operation,
      temporaryKey: generateUniqueId(),
      appearance: { color, alpha: initialAlpha }
    });
    myWorker.onmessage = (e: any) => {
      updateCurrentLabels(labels => {
        labels.splice(
          Math.max(editingData.activeLabelIndex + 1, targetLabelIndex + 1),
          0,
          e.data as InternalLabel
        );
      });
      reportProgress({ finished: true });
    };
  } else {
    console.log('× window.Worker');
    const size1 = label.data.size;
    const origin1 = label.data.origin;
    const size2 = targetLabel.data.size;
    const origin2 = targetLabel.data.origin;

    let ULx: number,
      ULy: number,
      ULz: number,
      LRx: number,
      LRy: number,
      LRz: number;
    if (operation === 'add') {
      ULx = Math.min(origin1[0], origin2[0]);
      ULy = Math.min(origin1[1], origin2[1]);
      ULz = Math.min(origin1[2], origin2[2]);
      LRx = Math.max(origin1[0] + size1[0], origin2[0] + size2[0]);
      LRy = Math.max(origin1[1] + size1[1], origin2[1] + size2[1]);
      LRz = Math.max(origin1[2] + size1[2], origin2[2] + size2[2]);
    } else if (operation === 'subtract') {
      [ULx, ULy, ULz] = origin1;
      LRx = ULx + size1[0];
      LRy = ULy + size1[1];
      LRz = ULz + size1[2];
    } else {
      ULx = Math.max(origin1[0], origin2[0]);
      ULy = Math.max(origin1[1], origin2[1]);
      ULz = Math.max(origin1[2], origin2[2]);
      LRx = Math.min(origin1[0] + size1[0], origin2[0] + size2[0]);
      LRy = Math.min(origin1[1] + size1[1], origin2[1] + size2[1]);
      LRz = Math.min(origin1[2] + size1[2], origin2[2] + size2[2]);
    }

    const label1 = new RawData(size1, 'binary');
    label1.assign(label.data.volumeArrayBuffer!);
    const label2 = new RawData(size2, 'binary');
    label2.assign(targetLabel.data.volumeArrayBuffer!);
    const newLabel: InternalLabelOf<'voxel'> = {
      temporaryKey: generateUniqueId(),
      name: `(${label.name})${
        operation === 'add' ? ' + ' : operation === 'subtract' ? ' - ' : ' ∩ '
      }(${targetLabel.name})`,
      ...createNewLabelData('voxel', { color, alpha: initialAlpha }),
      attributes: {},
      hidden: false
    };
    newLabel.data.size = [LRx - ULx, LRy - ULy, LRz - ULz];
    newLabel.data.origin = [ULx, ULy, ULz];
    const volume = new RawData([LRx - ULx, LRy - ULy, LRz - ULz], 'binary');
    const isInside = (
      pos: { i: number; j: number; k: number },
      origin: number[],
      size: number[]
    ) => {
      const { i, j, k } = pos;
      return (
        origin[0] <= i &&
        i < origin[0] + size[0] &&
        origin[1] <= j &&
        j < origin[1] + size[1] &&
        origin[2] <= k &&
        k < origin[2] + size[2]
      );
    };
    for (let k = ULz; k < LRz; k++) {
      for (let j = ULy; j < LRy; j++) {
        for (let i = ULx; i < LRx; i++) {
          if (operation === 'add') {
            if (
              (isInside({ i, j, k }, origin1, size1) &&
                0 <
                  label1.getPixelAt(
                    i - origin1[0],
                    j - origin1[1],
                    k - origin1[2]
                  )) ||
              (isInside({ i, j, k }, origin2, size2) &&
                0 <
                  label2.getPixelAt(
                    i - origin2[0],
                    j - origin2[1],
                    k - origin2[2]
                  ))
            )
              volume.writePixelAt(1, i - ULx, j - ULy, k - ULz);
          } else if (operation === 'subtract') {
            if (
              0 <
                label1.getPixelAt(
                  i - origin1[0],
                  j - origin1[1],
                  k - origin1[2]
                ) &&
              (isInside({ i, j, k }, origin2, size2)
                ? label2.getPixelAt(
                    i - origin2[0],
                    j - origin2[1],
                    k - origin2[2]
                  ) === 0
                : true)
            )
              volume.writePixelAt(1, i - ULx, j - ULy, k - ULz);
          } else {
            if (
              0 <
                label1.getPixelAt(
                  i - origin1[0],
                  j - origin1[1],
                  k - origin1[2]
                ) &&
              0 <
                label2.getPixelAt(
                  i - origin2[0],
                  j - origin2[1],
                  k - origin2[2]
                )
            )
              volume.writePixelAt(1, i - ULx, j - ULy, k - ULz);
          }
        }
      }
    }
    newLabel.data.volumeArrayBuffer = volume.data;
    updateCurrentLabels(labels => {
      labels.splice(
        Math.max(editingData.activeLabelIndex + 1, targetLabelIndex + 1),
        0,
        newLabel as InternalLabel
      );
    });
    reportProgress({ finished: true });
  }
};

export default booleanOperationsProcessor;
