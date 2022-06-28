import Icon from 'components/Icon';
import { DropdownButton, MenuItem } from 'components/react-bootstrap';
import React from 'react';
import { LabelType } from '../labelData';
import { processors, processorTypes, ProcessorType } from './processor-types';

const ProcessorDropdown: React.FC<{
  activeLabelType: LabelType | undefined;
  onSelect: (key: ProcessorType) => void;
}> = props => {
  const { activeLabelType, onSelect } = props;
  return (
    <DropdownButton
      onSelect={type => onSelect(type)}
      bsSize="xs"
      title={<Icon icon="glyphicon-option-horizontal" />}
      id={`labelmenu-header-dropdown`}
      pullRight
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
