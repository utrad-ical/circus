import Button from '#components/Button.tsx';
import { DialogBody, DialogFooter, DialogHeader } from '#components/Dialog.tsx';
import { ProgressBar } from '#components/react-bootstrap.ts';
import React, { useState } from 'react';
import styled from 'styled-components';
import type { ProcessorProgress, Editor } from './processor-types.ts';
import type { InternalLabel } from '../labelData.ts';

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
        <StyledDiv>
          <OptionsEditor
            value={options}
            onChange={setOptions}
            activeLabelIndex={activeLabelIndex}
            labels={labels}
          />
          {progress && 'value' in progress && (
            <div>
              <ProgressBar
                now={progress.value}
                label={progress.label}
                striped
                active
              />
            </div>
          )}
        </StyledDiv>
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

const StyledDiv = styled.div`
  display: flex;
  flex-flow: column;
  gap: 15px;
`;

export default ProcessorModal;
