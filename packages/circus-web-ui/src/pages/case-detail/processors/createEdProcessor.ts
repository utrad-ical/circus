import { alert } from '@smikitky/rb-components/lib/modal';
import dilation from '@utrad-ical/circus-rs/src/common/morphology/dilation';
import erosion from '@utrad-ical/circus-rs/src/common/morphology/erosion';
import {
  MorphologicalImageProcessingResults,
  Structure
} from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';
import edWorker from 'worker-loader!./edWorker';
import { VoxelLabelProcessor } from './performLabelCreatingVoxelProcessing';

export interface ErosionDilationOptions {
  structure: Structure;
  isErosion: boolean;
}

const createEdProcessor = (
  options: ErosionDilationOptions
): VoxelLabelProcessor<MorphologicalImageProcessingResults> => {
  return async props => {
    const {
      input,
      width,
      height,
      nSlices,
      name,
      postProcessor,
      handleProgress
    } = props;

    const { structure, isErosion } = options;
    const padding = isErosion
      ? [0, 0, 0]
      : [
          Math.floor(structure.width / 2),
          Math.floor(structure.height / 2),
          Math.floor(structure.nSlices / 2)
        ];
    handleProgress({ value: 100, label: '' });

    const initializedInput = new Uint8Array(
      (width + 2 * padding[0]) *
        (height + 2 * padding[1]) *
        (nSlices + 2 * padding[2])
    );

    for (let k = padding[2], pos0 = 0; k < nSlices + padding[2]; k++) {
      for (let j = padding[1]; j < height + padding[1]; j++) {
        for (let i = padding[0]; i < width + padding[0]; i++) {
          const pos =
            i +
            j * (width + 2 * padding[0]) +
            k * (width + 2 * padding[0]) * (height + 2 * padding[1]);
          initializedInput[pos] = input[pos0++];
        }
      }
    }

    if (window.Worker) {
      const myWorker = new edWorker();
      myWorker.postMessage({
        input: initializedInput,
        width: width + 2 * padding[0],
        height: height + 2 * padding[1],
        nSlices: nSlices + 2 * padding[2],
        structure: structure,
        isErosion: isErosion
      });
      myWorker.onmessage = (e: any) => {
        if (typeof e.data === 'string') {
          handleProgress({ value: 100, label: 'Failed' });
          alert(`structuring element is invalid.`);
          return;
        }
        const result = e.data;

        postProcessor({
          processingResults: {
            result: result,
            min: [-padding[0], -padding[1], -padding[2]],
            max: [
              width - 1 + padding[0],
              height - 1 + padding[1],
              nSlices - 1 + padding[2]
            ]
          },
          names: [isErosion ? `eroded ${name}` : `dilated ${name}`]
        });
        handleProgress({ value: 100, label: 'Completed' });
      };
    } else {
      console.log('× window.Worker');
      let result: Uint8Array;
      try {
        result = isErosion
          ? erosion(
              initializedInput,
              width + 2 * padding[0],
              height + 2 * padding[1],
              nSlices + 2 * padding[2],
              structure
            )
          : dilation(
              initializedInput,
              width + 2 * padding[0],
              height + 2 * padding[1],
              nSlices + 2 * padding[2],
              structure
            );
      } catch (err: any) {
        console.log('error', err.message);
        alert(`${name} is too complex.\nPlease modify ${name}.`);
        return;
      }
      postProcessor({
        processingResults: {
          result: result,
          min: [-padding[0], -padding[1], -padding[2]],
          max: [
            width - 1 + padding[0],
            height - 1 + padding[1],
            nSlices - 1 + padding[2]
          ]
        },
        names: [isErosion ? `eroded ${name}` : `dilated ${name}`]
      });
      handleProgress({ value: 100, label: 'Completed' });
    }
  };
};

export default createEdProcessor;
