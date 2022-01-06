import Icon from 'components/Icon';
import { DropdownButton, MenuItem } from 'components/react-bootstrap';
import React from 'react';
import { LabelType } from '../labelData';
import { ProcessorDialogKey } from './processor-types';

const voxelProcessorDropdownProperties: {
  key: ProcessorDialogKey;
  caption: string;
  labelType: LabelType;
}[] = [
  { key: 'ccl', caption: 'CCL', labelType: 'voxel' },
  { key: 'filling', caption: 'Hole filling', labelType: 'voxel' },
  { key: 'erosion', caption: 'Erosion', labelType: 'voxel' },
  { key: 'dilation', caption: 'Dilation', labelType: 'voxel' },
  {
    key: 'interpolation',
    caption: 'Interslice interpolation',
    labelType: 'voxel'
  },
  { key: 'section', caption: 'Three points to section', labelType: 'point' }
];

const ProcessorDropdown: React.FC<{
  activeLabelType: LabelType | undefined;
  onSelect: (key: ProcessorDialogKey) => void;
}> = props => {
  const { activeLabelType, onSelect } = props;
  return (
    <DropdownButton
      bsSize="xs"
      title={<Icon icon="glyphicon-option-horizontal" />}
      id={`labelmenu-header-dropdown`}
      pullRight
      noCaret
    >
      {voxelProcessorDropdownProperties.map(properties => {
        return (
          <MenuItem
            key={properties.key}
            eventKey={properties.key}
            onSelect={() => onSelect(properties.key)}
            disabled={activeLabelType !== properties.labelType}
          >
            {properties.caption}
          </MenuItem>
        );
      })}
    </DropdownButton>
  );
};

export default ProcessorDropdown;
