import { alert } from '@smikitky/rb-components/lib/modal';
import HoleFilling2D, {
  HoleFilling3D
} from '@utrad-ical/circus-rs/src/common/CCL/holeFilling';
import {
  VoxelLabelProcessor,
  PostProcessor
} from './performLabelCreatingVoxelProcessing';
import hfWorker from 'worker-loader!./hfWorker';

export interface HoleFillingOptions {
  dimension: 2 | 3;
  neighbors: 4 | 8 | 6 | 26;
  orientation: 'Axial' | 'Coronal' | 'Sagital';
}

const createHfProcessor = (
  options: HoleFillingOptions
): VoxelLabelProcessor => {
  return async (
    input: Uint8Array,
    width: number,
    height: number,
    nSlices: number,
    name: string,
    postProcessor: PostProcessor,
    reportProgress: (progress: { value: number; label: string }) => void
  ) => {
    const { dimension, neighbors, orientation } = options;

    reportProgress({ value: 100, label: '' });

    if (window.Worker) {
      const myWorker = new hfWorker();
      myWorker.postMessage({
        input,
        width,
        height,
        nSlices,
        dimension,
        neighbors,
        orientation
      });
      myWorker.onmessage = (e: any) => {
        if (typeof e.data === 'string') {
          reportProgress({ value: 100, label: 'Failed' });
          alert(`${name} is too complex.\nPlease modify ${name}.`);
          return;
        }
        const { result, _, holeVolume } = e.data;
        postProcessor({
          labelingResults: {
            labelMap: result,
            labelNum: 1,
            labels: [
              {
                volume: holeVolume,
                min: [0, 0, 0],
                max: [width - 1, height - 1, nSlices - 1]
              }
            ]
          },
          names: [
            `${name}: ${dimension}D hole filling${
              dimension !== 3 ? ' (' + orientation + ')' : ''
            }`
          ]
        });
        reportProgress({ value: 100, label: 'Completed' });
      };
    } else {
      console.log('× window.Worker');
      const initializedInput = new Uint8Array(width * height * nSlices);
      for (let k = 0; k < nSlices; k++) {
        for (let j = 0; j < height; j++) {
          for (let i = 0; i < width; i++) {
            const pos0 = i + j * width + k * width * height;
            const pos =
              dimension === 3 || orientation === 'Axial'
                ? i + j * width + k * width * height
                : orientation === 'Coronal'
                ? k + i * nSlices + j * width * nSlices
                : j + k * height + i * height * nSlices;
            initializedInput[pos] = input[pos0];
          }
        }
      }
      let holeFillingResult:
        | { result: Uint8Array; holeNum: number; holeVolume: number }
        | undefined = undefined;
      try {
        holeFillingResult =
          dimension === 3
            ? HoleFilling3D(initializedInput, width, height, nSlices, neighbors)
            : orientation === 'Axial'
            ? HoleFilling2D(initializedInput, width, height, nSlices, neighbors)
            : orientation === 'Sagital'
            ? HoleFilling2D(initializedInput, height, nSlices, width, neighbors)
            : HoleFilling2D(
                initializedInput,
                nSlices,
                width,
                height,
                neighbors
              );
      } catch (err) {
        console.log('error', err.message);
        alert(`${name} is too complex.\nPlease modify ${name}.`);
        return;
      }
      const output = new Uint8Array(width * height * nSlices);
      for (let k = 0; k < nSlices; k++) {
        for (let j = 0; j < height; j++) {
          for (let i = 0; i < width; i++) {
            const pos0 = i + j * width + k * width * height;
            const pos =
              dimension === 3 || orientation === 'Axial'
                ? i + j * width + k * width * height
                : orientation === 'Coronal'
                ? k + i * nSlices + j * width * nSlices
                : j + k * height + i * height * nSlices;
            output[pos0] = holeFillingResult.result[pos];
          }
        }
      }
      postProcessor({
        labelingResults: {
          labelMap: output,
          labelNum: 1,
          labels: [
            {
              volume: holeFillingResult.holeVolume,
              min: [0, 0, 0],
              max: [width - 1, height - 1, nSlices - 1]
            }
          ]
        },
        names: [
          `${name}: ${dimension}D hole filling${
            dimension !== 3 ? ' (' + orientation + ')' : ''
          }`
        ]
      });
      reportProgress({ value: 100, label: 'Completed' });
    }
  };
};

export default createHfProcessor;
