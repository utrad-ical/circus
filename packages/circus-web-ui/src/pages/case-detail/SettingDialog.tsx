import { Button, Modal } from 'components/react-bootstrap';
import React from 'react';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';

interface property {
  title: string;
  value: any;
  numericalValue: boolean;
  onChange: (value: any) => void;
  options: { [type: string]: string };
}

const SettingDialog: <T extends property[]>(props: {
  title: string;
  properties: T;
  onHide: () => void;
  onOkClick: () => void;
}) => React.ReactElement<any> = props => {
  const { title, properties, onHide, onOkClick } = props;
  return (
    <>
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {properties.map(p => {
          return (
            <div key={p.title}>
              {`${p.title}: `}
              <ShrinkSelect
                bsSize="sm"
                options={p.options}
                value={p.value}
                numericalValue={p.numericalValue}
                onChange={p.onChange}
              />
            </div>
          );
        })}
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={() => onHide()}>
          Cancel
        </Button>
        <Button onClick={() => onOkClick()} bsStyle="primary">
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default SettingDialog;
