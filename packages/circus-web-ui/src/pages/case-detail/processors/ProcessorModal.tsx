import { Editor } from '@smikitky/rb-components/lib/editor-types';
import { Button, Modal, ProgressBar } from 'components/react-bootstrap';
import React, { useState } from 'react';
import styled from 'styled-components';
import { ProcessorProgress } from './processor-types';

const ProcessorModal: React.FC<{
  title: string;
  optionsEditor: Editor<any>;
  initialOptions: any;
  onOkClick: (options: any) => void;
  onHide: () => void;
  progress: ProcessorProgress | null;
}> = props => {
  const {
    title,
    optionsEditor: OptionsEditor,
    initialOptions,
    onOkClick,
    onHide,
    progress
  } = props;

  const handleOkClick = () => {
    onOkClick(options);
  };

  const [options, setOptions] = useState(initialOptions);

  return (
    <Modal show={true} onHide={onHide}>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <StyledDiv>
          <OptionsEditor value={options} onChange={setOptions} />
          {progress && (
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
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={handleOkClick} bsStyle="primary">
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const StyledDiv = styled.div`
  display: flex;
  flex-flow: column;
  gap: 15px;
`;

export default ProcessorModal;
