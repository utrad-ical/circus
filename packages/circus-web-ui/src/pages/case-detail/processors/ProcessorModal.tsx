import Button from '#components/Button.tsx';
import { DialogBody, DialogFooter, DialogHeader } from '#components/Dialog.tsx';
import ProgressBar from '#components/ProgressBar.tsx';
import React, { useState } from 'react';
import type { ProcessorProgress, Editor } from './processor-types.ts';
import type { InternalLabel } from '../labelData.ts';
import styles from './ProcessorModal.module.css';

const ProcessorModal: React.FC<{
  title: string;
  optionsEditor: Editor<any>;
  initialOptions: any;
  onOkClick: (options: any) => void;
  onHide: () => void;
  progress: ProcessorProgress | null;
  activeLabelIndex: number;
  labels: InternalLabel[];
}> = props => {
  const {
    title,
    optionsEditor: OptionsEditor,
    initialOptions,
    onOkClick,
    onHide,
    progress,
    activeLabelIndex,
    labels
  } = props;

  const handleOkClick = () => {
    onOkClick(options);
  };

  const [options, setOptions] = useState(initialOptions);

  return (
    <>
      <DialogHeader>{title}</DialogHeader>
      <DialogBody>
        <div className={styles.options}>
          <OptionsEditor
            value={options}
            onChange={setOptions}
            activeLabelIndex={activeLabelIndex}
            labels={labels}
          />
          {progress && !progress.finished && (
            <ProgressBar value={progress.value} label={progress.label} />
          )}
        </div>
      </DialogBody>
      <DialogFooter>
        <Button variant="link" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={handleOkClick} variant="primary">
          OK
        </Button>
      </DialogFooter>
    </>
  );
};

export default ProcessorModal;
