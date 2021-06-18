import { Button, Modal } from 'components/react-bootstrap';
import React, { useState } from 'react';
import PropertyEditor from '@smikitky/rb-components/lib/PropertyEditor';

const SettingDialog: (props: {
  title: string;
  initialValues: any;
  properties: any;
  onHide: () => void;
  onOkClick: (parameters: any) => void;
  onChange?: (parameters: any) => void;
}) => React.ReactElement<any> = props => {
  const {
    title,
    initialValues,
    properties,
    onHide,
    onOkClick,
    onChange
  } = props;
  const [parameters, setParameters] = useState<typeof properties>(
    initialValues
  );
  return (
    <>
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <PropertyEditor
          className="setting-dialog"
          properties={properties}
          value={parameters}
          onChange={(parameters: any) => {
            setParameters(parameters);
            onChange && onChange(parameters);
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={() => onHide()}>
          Cancel
        </Button>
        <Button onClick={() => onOkClick(parameters)} bsStyle="primary">
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SettingDialog;
