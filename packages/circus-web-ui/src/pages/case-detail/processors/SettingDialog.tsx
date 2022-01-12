import { Editor } from '@smikitky/rb-components/lib/editor-types';
import { Button, Modal, ProgressBar } from 'components/react-bootstrap';
import React, { useState } from 'react';
import styled from 'styled-components';

const StyledDiv = styled.div`
  line-height: 2.5;
`;

const SettingDialog: React.FC<{
  title: string;
  optionsEditor: Editor<any>;
  initialOptions: any;
  processorProgress: { value: number; label: string };
  onHide: () => void;
  onOkClick: (props: any) => void;
}> = props => {
  const {
    title,
    optionsEditor: OptionsEditor,
    initialOptions,
    processorProgress,
    onHide,
    onOkClick
  } = props;
  const [options, setOptions] = useState(initialOptions);

  return (
    <>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <StyledDiv>
          <OptionsEditor value={options} onChange={setOptions} />
        </StyledDiv>
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={() => onOkClick(options)} bsStyle="primary">
          OK
        </Button>
        {processorProgress.value !== 0 && (
          <div>
            <span>&nbsp;</span>
            <ProgressBar
              now={processorProgress.value}
              label={processorProgress.label}
              striped
              active
            />
          </div>
        )}
      </Modal.Footer>
    </>
  );
};

export default SettingDialog;
