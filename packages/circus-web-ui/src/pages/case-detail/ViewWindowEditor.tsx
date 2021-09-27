import React, { useState, useMemo } from 'react';
import { Button, Modal } from 'components/react-bootstrap';
import PropertyEditor, {
  PropertyEditorProperties
} from '@smikitky/rb-components/lib/PropertyEditor';
import * as et from '@smikitky/rb-components/lib/editor-types';

export interface ViewWindow {
  level: number;
  width: number;
}

const ViewWindowEditor: React.FC<{
  initialValue: ViewWindow;
  onHide: () => void;
  onOkClick: (props: ViewWindow) => void;
}> = props => {
  const { initialValue, onHide, onOkClick } = props;
  const [window, setWindow] = useState<ViewWindow>(() => {
    return initialValue ?? { level: 0, width: 0 };
  });

  const properties = useMemo(() => {
    return [
      { key: 'level', caption: 'Window level', editor: et.number() },
      { key: 'width', caption: 'Window width', editor: et.number() }
    ] as PropertyEditorProperties<ViewWindow>;
  }, []);

  return (
    <>
      <Modal.Header>Set window level and window width</Modal.Header>
      <Modal.Body>
        <PropertyEditor
          properties={properties}
          value={window}
          onChange={setWindow}
        />
        <hr />
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={() => onOkClick(window)} bsStyle="primary">
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default ViewWindowEditor;
