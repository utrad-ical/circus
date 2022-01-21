import { alert } from '@smikitky/rb-components/lib/modal';
import intersliceInterpolation from '@utrad-ical/circus-rs/src/common/morphology/intersliceInterpolation';
import { MorphologicalImageProcessingResults } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';
import iiWorker from 'worker-loader!./ii-worker';
import performLabelCreatingVoxelProcessing, {
  VoxelLabelProcessor
} from './performLabelCreatingVoxelProcessing';

export interface IntersliceInterpolationOptions {
  orientation: 'Axial' | 'Coronal' | 'Sagital';
}

const transpose = (
  input: Uint8Array,
  width: number,
  height: number,
  nSlices: number,
  orientation: 'Axial' | 'Coronal' | 'Sagital',
  reverse: boolean
): Uint8Array => {
  if (orientation === 'Axial') return input.slice(0);
  const transposeImg = new Uint8Array(width * height * nSlices);
  for (let k = 0; k < nSlices; k++) {
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        const pos0 = i + j * width + k * width * height;
        const pos =
          orientation === 'Coronal'
            ? k + i * nSlices + j * width * nSlices
            : j + k * height + i * height * nSlices;
        if (reverse) transposeImg[pos0] = input[pos];
        else transposeImg[pos] = input[pos0];
      }
    }
  }
  return transposeImg;
};

const iiVoxelProcessor: VoxelLabelProcessor<
  MorphologicalImageProcessingResults,
  IntersliceInterpolationOptions
> = props => {
  const {
    options: { orientation },
    input,
    width,
    height,
    nSlices,
    name,
    postProcessor,
    reportProgress
  } = props;

  const initializedInput = transpose(
    input,
    width,
    height,
    nSlices,
    orientation,
    false
  );
  const transposedWidth =
    orientation === 'Axial'
      ? width
      : orientation === 'Coronal'
      ? nSlices
      : height;
  const transposedHeight =
    orientation === 'Axial'
      ? height
      : orientation === 'Coronal'
      ? width
      : nSlices;
  const transposedNSlices =
    orientation === 'Axial'
      ? nSlices
      : orientation === 'Coronal'
      ? height
      : width;

  if (window.Worker) {
    const myWorker = new iiWorker();
    myWorker.postMessage({
      input: initializedInput,
      width: transposedWidth,
      height: transposedHeight,
      nSlices: transposedNSlices
    });
    myWorker.onmessage = (e: any) => {
      if (typeof e.data === 'string') {
        reportProgress({ value: 100, label: 'Failed', finished: true });
        alert(e.data);
        return;
      }
      const result = transpose(
        e.data,
        width,
        height,
        nSlices,
        orientation,
        true
      );

      postProcessor({
        processingResults: {
          result: result,
          min: [0, 0, 0],
          max: [width - 1, height - 1, nSlices - 1]
        },
        names: [`interpolated ${name}`]
      });
      reportProgress({ value: 100, label: 'Completed', finished: true });
    };
  } else {
    console.log('× window.Worker');
    let result: Uint8Array;
    try {
      result = transpose(
        intersliceInterpolation(
          initializedInput,
          transposedWidth,
          transposedHeight,
          transposedNSlices
        ),
        width,
        height,
        nSlices,
        orientation,
        true
      );
    } catch (err: any) {
      console.log('error', err.message);
      alert(err.message);
      return;
    }
    postProcessor({
      processingResults: {
        result: result,
        min: [0, 0, 0],
        max: [width - 1, height - 1, nSlices - 1]
      },
      names: [`interpolated ${name}`]
    });
    reportProgress({ value: 100, label: 'Completed', finished: true });
  }
};

const iiProcessor = performLabelCreatingVoxelProcessing(iiVoxelProcessor);
export default iiProcessor;
