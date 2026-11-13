import Button from '#components/Button.tsx';
import * as et from '@smikitky/rb-components/lib/editor-types';
import type { PropertyEditorProperties } from '@smikitky/rb-components/lib/PropertyEditor';
import PropertyEditor from '@smikitky/rb-components/lib/PropertyEditor';
import type { PartialVolumeDescriptor } from '@utrad-ical/circus-rs';
import {
  describePartialVolumeDescriptor,
  rangeHasPartialVolume
} from '@utrad-ical/circus-rs';
import { DialogBody, DialogFooter } from '#components/Dialog.tsx';
import * as mr from 'multi-integer-range';
import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

const PartialVolumeDescriptorEditor: React.FC<{
  onResolve: (
    result: null | { descriptor: PartialVolumeDescriptor | null }
  ) => void;
  initialValue: PartialVolumeDescriptor;
  images: mr.MIR;
}> = props => {
  const { onResolve, images, initialValue } = props;
  const [descriptor, setDescriptor] = useState<PartialVolumeDescriptor>(() => {
    return (
      initialValue ?? {
        start: mr.min(images)!,
        end: mr.max(images)!,
        delta: 1
      }
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
    const maxImage = mr.max(images);
    return [
      {
        key: 'start',
        caption: 'Start',
        editor: et.number({ min: 1, max: maxImage })
      },
      {
        key: 'end',
        caption: 'End',
        editor: et.number({ min: 1, max: maxImage })
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
      <DialogBody>
        <p>
          <b>Uploaded images:</b> {mr.stringify(images)}
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
          <Button
            icon="material-swap_horiz"
            disabled={!isValid}
            onClick={handleFlip}
          >
            Flip start/end
          </Button>
        </PreviewDiv>
      </DialogBody>
      <DialogFooter>
        <Button variant="link" onClick={() => onResolve(null)}>
          Cancel
        </Button>
        <Button onClick={() => onResolve({ descriptor: null })}>
          Remove Partial Volume
        </Button>
        <Button
          onClick={() => onResolve({ descriptor })}
          disabled={!isValid}
          variant="primary"
        >
          OK
        </Button>
      </DialogFooter>
    </>
  );
};

const PreviewDiv = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export default PartialVolumeDescriptorEditor;
