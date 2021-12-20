import { alert } from '@smikitky/rb-components/lib/modal';
import {
  PostProcessor,
  VoxelLabelProcessor
} from './performLabelCreatingVoxelProcessing';
import { MorphologicalImageProcessingResults } from '@utrad-ical/circus-rs/src/common/morphology/morphology-types';

export interface DuplicateOptions {
  newName: string;
  complement: boolean;
}

const createEdProcessor = (
  options: DuplicateOptions
): VoxelLabelProcessor<MorphologicalImageProcessingResults> => {
  return async (
    input: Uint8Array,
    width: number,
    height: number,
    nSlices: number,
    name: string,
    postProcessor: PostProcessor<MorphologicalImageProcessingResults>,
    reportProgress: (progress: { value: number; label: string }) => void
  ) => {
    const { newName, complement } = options;
    reportProgress({ value: 100, label: '' });

    postProcessor({
      processingResults: {
        result: input,
        min: [0, 0, 0],
        max: [width - 1, height - 1, nSlices - 1]
      },
      names: [newName]
    });
    reportProgress({ value: 100, label: 'Completed' });
  };
};

export default createEdProcessor;
