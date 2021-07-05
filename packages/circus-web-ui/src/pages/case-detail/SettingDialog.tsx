import { Button, Modal } from 'components/react-bootstrap';
import React, { useState } from 'react';
import { Editor } from '@smikitky/rb-components/lib/editor-types';

const SettingDialog: React.FC<{
  title: string;
  optionsEditor: Editor<any>;
  initialOptions: any;
  onHide: () => void;
  onOkClick: (props: any) => void;
}> = props => {
  const {
    title,
    optionsEditor: OptionsEditor,
    initialOptions,
    onHide,
    onOkClick
  } = props;
  const [options, setOptions] = useState(initialOptions);

  return (
    <>
      <Modal.Header>{title}</Modal.Header>
      <Modal.Body>
        <OptionsEditor value={options} onChange={setOptions} />
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={() => onOkClick(options)} bsStyle="primary">
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SettingDialog;
