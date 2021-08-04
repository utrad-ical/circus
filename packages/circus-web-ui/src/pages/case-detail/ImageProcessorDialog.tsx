import { Editor } from '@smikitky/rb-components/lib/editor-types';
import { Button, Modal, ProgressBar } from 'components/react-bootstrap';
import React, { useState } from 'react';

const ImageProcessorDialog: React.FC<{
  title: string;
  optionsEditor: Editor<any>;
  initialOptions: any;
  onHide: () => void;
  onOkClick: (
    props: any,
    setImageProcessorProgress: (progress: {
      value: number;
      label: string;
    }) => void
  ) => void;
}> = props => {
  const {
    title,
    optionsEditor: OptionsEditor,
    initialOptions,
    onHide,
    onOkClick
  } = props;
  const [options, setOptions] = useState(initialOptions);
  const [imageProcessorProgress, setImageProcessorProgress] = useState({
    value: 0,
    label: ''
  });

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
        <Button
          onClick={() => onOkClick(options, setImageProcessorProgress)}
          bsStyle="primary"
        >
          OK
        </Button>
        {imageProcessorProgress.value !== 0 && (
          <ProgressBar
            now={imageProcessorProgress.value}
            label={imageProcessorProgress.label}
            striped
            active
          />
        )}
      </Modal.Footer>
    </>
  );
};

export default ImageProcessorDialog;
