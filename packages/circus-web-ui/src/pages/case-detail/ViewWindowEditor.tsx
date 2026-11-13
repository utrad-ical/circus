import Button from '#components/Button.tsx';
import React, { useState, useMemo } from 'react';
import { DialogBody, DialogFooter, DialogHeader } from '#components/Dialog.tsx';
import type { PropertyEditorProperties } from '#components/PropertyEditor.tsx';
import PropertyEditor from '#components/PropertyEditor.tsx';
import * as et from '#components/editorTypes.tsx';

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
      <DialogHeader>Set window level and window width</DialogHeader>
      <DialogBody>
        <PropertyEditor
          properties={properties}
          value={window}
          onChange={setWindow}
        />
        <hr />
      </DialogBody>
      <DialogFooter>
        <Button variant="link" onClick={onHide}>
          Cancel
        </Button>
        <Button onClick={() => onOkClick(window)} variant="primary">
          OK
        </Button>
      </DialogFooter>
    </>
  );
};

export default ViewWindowEditor;
