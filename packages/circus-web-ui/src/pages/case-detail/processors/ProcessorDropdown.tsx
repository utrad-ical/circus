import DropdownButton from '#components/DropdownButton.tsx';
import Icon from '#components/Icon.tsx';
import MenuItem from '#components/MenuItem.tsx';
import React from 'react';
import type { LabelType } from '../labelData.ts';
import type { ProcessorType } from './processor-types.ts';
import { processors, processorTypes } from './processor-types.ts';

const ProcessorDropdown: React.FC<{
  activeLabelType: LabelType | undefined;
  onSelect: (key: ProcessorType) => void;
}> = props => {
  const { activeLabelType, onSelect } = props;
  return (
    <DropdownButton
      onSelect={type => onSelect(type as ProcessorType)}
      size="xs"
      title={<Icon icon="material-more_horiz" />}
      placement="bottom-end"
      noCaret
    >
      {processorTypes.map(type => {
        return (
          <MenuItem
            key={type}
            eventKey={type}
            disabled={
              !processors[type].labelType.some(
                labelType => labelType === activeLabelType
              )
            }
          >
            {processors[type].caption}
          </MenuItem>
        );
      })}
    </DropdownButton>
  );
};

export default ProcessorDropdown;
