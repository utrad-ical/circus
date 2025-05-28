import DropdownButton from 'components/DropdownButton';
import Icon from 'components/Icon';
import MenuItem from 'components/MenuItem';
import React from 'react';
import { LabelType } from '../labelData';
import { processors, ProcessorType, processorTypes } from './processor-types';

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
