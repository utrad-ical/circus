import React, { useState, useMemo } from 'react';
import { Button, Modal } from 'components/react-bootstrap';
import PropertyEditor from '@smikitky/rb-components/lib/PropertyEditor';
import * as et from '@smikitky/rb-components/lib/editor-types';
import MultiRange from 'multi-integer-range';
import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor,
  isValidPartialVolumeDescriptor
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';

const PartialVolumeDescriptorEditor: React.FC<{
  onResolve: (
    result: null | { descriptor: PartialVolumeDescriptor | null }
  ) => void;
  initialValue?: PartialVolumeDescriptor;
  images: string;
}> = props => {
  const { onResolve, images } = props;
  const [descriptor, setDescriptor] = useState<PartialVolumeDescriptor>(() => {
    const mr = new MultiRange(images);
    return props.initialValue
      ? props.initialValue
      : { start: mr.min()!, end: mr.max()!, delta: 1 };
  });

  const properties = useMemo(() => {
    const mr = new MultiRange(images);
    return [
      { key: 'start', editor: et.number({ min: 1, max: mr.max() }) },
      { key: 'end', editor: et.number({ min: 1, max: mr.max() }) },
      { key: 'delta', editor: et.number({ min: -10, max: 10 }) }
    ];
  }, [images]);

  return (
    <>
      <Modal.Body>
        <PropertyEditor
          properties={properties}
          value={descriptor}
          onChange={setDescriptor}
        />
        <hr />
        <b>Preview:</b> {describePartialVolumeDescriptor(descriptor)}
      </Modal.Body>
      <Modal.Footer>
        <Button bsStyle="link" onClick={() => onResolve(null)}>
          Cancel
        </Button>
        <Button onClick={() => onResolve({ descriptor: null })}>
          Remove Partial Volume
        </Button>
        <Button
          onClick={() => onResolve({ descriptor })}
          disabled={!isValidPartialVolumeDescriptor(descriptor)}
          bsStyle="primary"
        >
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default PartialVolumeDescriptorEditor;
