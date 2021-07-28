import { Editor } from '@smikitky/rb-components/lib/editor-types';
import { Button, Modal, ProgressBar } from 'components/react-bootstrap';
import React, { useState } from 'react';

const SettingDialog: React.FC<{
  title: string;
  optionsEditor: Editor<any>;
  initialOptions: any;
  progress: { value: number; label: string };
  onHide: () => void;
  onOkClick: (props: any) => void;
}> = props => {
  const {
    title,
    optionsEditor: OptionsEditor,
    initialOptions,
    progress,
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
        {progress.label !== '' && (
          <ProgressBar
            now={progress.value}
            label={progress.label}
            striped
            active
          />
        )}
      </Modal.Footer>
    </>
  );
};

export default SettingDialog;
