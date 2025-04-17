import * as et from '@smikitky/rb-components/lib/editor-types';
import PropertyEditor, {
  PropertyEditorProperties
} from '@smikitky/rb-components/lib/PropertyEditor';
import PartialVolumeDescriptor, {
  describePartialVolumeDescriptor,
  rangeHasPartialVolume
} from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import { Button, Modal } from 'components/react-bootstrap';
import MultiRange from 'multi-integer-range';
import React, { useMemo, useState } from 'react';
import IconButton from './IconButton';
import styled from 'styled-components';

const PartialVolumeDescriptorEditor: React.FC<{
  onResolve: (
    result: null | { descriptor: PartialVolumeDescriptor | null }
  ) => void;
  initialValue: PartialVolumeDescriptor;
  images: MultiRange;
}> = props => {
  const { onResolve, images, initialValue } = props;
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
      {
        key: 'start',
        caption: 'Start',
        editor: et.number({ min: 1, max: mr.max() })
      },
      {
        key: 'end',
        caption: 'End',
        editor: et.number({ min: 1, max: mr.max() })
      },
      {
        key: 'delta',
        caption: 'Delta',
        editor: et.number({ min: -10, max: 10 })
      }
    ] as PropertyEditorProperties<PartialVolumeDescriptor>;
  }, [images]);

  const handleFlip = () => {
    if (!isValid) return;
    setDescriptor(d => ({ start: d.end, end: d.start, delta: -d.delta }));
  };

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
        <PreviewDiv>
          <span>
            <b>Preview:</b> {describePartialVolumeDescriptor(descriptor)}
          </span>
          <IconButton
            icon="material-swap_horiz"
            disabled={!isValid}
            onClick={handleFlip}
          >
            Flip start/end
          </IconButton>
        </PreviewDiv>
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

const PreviewDiv = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export default PartialVolumeDescriptorEditor;
