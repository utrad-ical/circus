import Icon from 'components/Icon';
import { DropdownButton, MenuItem } from 'components/react-bootstrap';
import React from 'react';
import { LabelType } from '../labelData';
import {
  Processor,
  ProcessorDialogKey,
  processorProperties
} from './processor-types';

const ProcessorDropdown: React.FC<{
  activeLabelType: LabelType | undefined;
  onSelect: (key: ProcessorDialogKey) => void;
  setProcessor: React.Dispatch<React.SetStateAction<Processor>>;
}> = props => {
  const { activeLabelType, onSelect, setProcessor } = props;
  return (
    <DropdownButton
      bsSize="xs"
      title={<Icon icon="glyphicon-option-horizontal" />}
      id={`labelmenu-header-dropdown`}
      pullRight
      noCaret
    >
      {Object.keys(processorProperties).map(key => {
        const dialogKey = key as ProcessorDialogKey;
        return (
          <MenuItem
            key={dialogKey}
            eventKey={dialogKey}
            onSelect={() => {
              onSelect(dialogKey);
              if (!processorProperties[dialogKey].settingDialog)
                setProcessor({
                  processor: processorProperties[dialogKey].processor(),
                  update: processorProperties[dialogKey].update
                });
            }}
            disabled={
              activeLabelType !== processorProperties[dialogKey].labelType
            }
          >
            {processorProperties[dialogKey].caption}
          </MenuItem>
        );
      })}
    </DropdownButton>
  );
};

export default ProcessorDropdown;
