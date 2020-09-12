import React, { useState, useMemo } from 'react';
import { Button, Modal } from 'components/react-bootstrap';
import PropertyEditor, {
  PropertyEditorProperties
} from '@smikitky/rb-components/lib/PropertyEditor';
import * as et from '@smikitky/rb-components/lib/editor-types';
import MultiRange from 'multi-integer-range';
import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor,
  rangeHasPartialVolume
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';

const PartialVolumeDescriptorEditor: React.FC<{
  onResolve: (
    result: null | { descriptor: PartialVolumeDescriptor | null }
  ) => void;
  initialValue: PartialVolumeDescriptor;
  images: MultiRange;
}> = props => {
  const { onResolve, images, initialValue } = props;
  console.log('I', initialValue);
  const [descriptor, setDescriptor] = useState<PartialVolumeDescriptor>(() => {
    return (
      initialValue ?? { start: images.min()!, end: images.max()!, delta: 1 }
    );
  });

  const isValid = useMemo(() => {
    try {
      return rangeHasPartialVolume(images, descriptor);
    } catch (e) {
      return false;
    }
  }, [descriptor, images]);

  const properties = useMemo(() => {
    const mr = new MultiRange(images);
    return [
      { key: 'start', editor: et.number({ min: 1, max: mr.max() }) },
      { key: 'end', editor: et.number({ min: 1, max: mr.max() }) },
      { key: 'delta', editor: et.number({ min: -10, max: 10 }) }
    ] as PropertyEditorProperties<PartialVolumeDescriptor>;
  }, [images]);

  return (
    <>
      <Modal.Body>
        <p>
          <b>Uploaded images:</b> {images.toString()}
        </p>
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
          disabled={!isValid}
          bsStyle="primary"
        >
          OK
        </Button>
      </Modal.Footer>
    </>
  );
};

export default PartialVolumeDescriptorEditor;
