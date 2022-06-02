import generateUniqueId from '@utrad-ical/circus-lib/src/generateUniqueId';
import createCurrentLabelsUpdator from '../createCurrentLabelsUpdator';
import { InternalLabelOf, LabelType, InternalLabel } from '../labelData';
import { Processor, ProcessorProgress } from './processor-types';

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
    hints: { labelColors },
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
