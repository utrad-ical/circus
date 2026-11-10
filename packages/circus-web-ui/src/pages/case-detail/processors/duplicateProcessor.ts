import generateUniqueId from 'utils/generateUniqueId';
import createCurrentLabelsUpdator from '../createCurrentLabelsUpdator.ts';
import type {
  InternalLabelOf,
  LabelType,
  InternalLabel
} from '../labelData.ts';
import type { Processor, ProcessorProgress } from './processor-types.ts';

export interface DuplicateOptions {
  newName: string;
}

export type LabelProcessor = (props: {
  options: DuplicateOptions;
  reportProgress: (progress: ProcessorProgress) => void;
}) => void;

const duplicateProcessor: Processor<DuplicateOptions> = (options, input) => {
  const {
    editingData,
    updateEditingData,
    selectedLabel: label,
    reportProgress
  } = input;

  const { newName } = options;

  const duplicateLabel = (): InternalLabelOf<LabelType> => {
    const temporaryKey = generateUniqueId();
    return {
      type: label.type,
      data: label.data,
      temporaryKey,
      name: newName,
      attributes: {},
      hidden: false
    };
  };

  const updateCurrentLabels = createCurrentLabelsUpdator(
    editingData,
    updateEditingData
  );

  const newLabel = duplicateLabel();
  updateCurrentLabels(labels => {
    labels.splice(
      editingData.activeLabelIndex + 1,
      0,
      newLabel as InternalLabel
    );
  });

  reportProgress({ finished: true });
};

export default duplicateProcessor;
