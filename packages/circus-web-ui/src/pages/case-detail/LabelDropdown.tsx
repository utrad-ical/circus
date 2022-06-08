import Icon from 'components/Icon';
import { DropdownButton, MenuItem } from 'components/react-bootstrap';
import React, { useState } from 'react';
import styled from 'styled-components';
import { mostReadable } from 'tinycolor2';
import { InternalLabel, labelTypes } from './labelData';

interface DisplayOptions {
  labelIcon: boolean;
  colorPreview: boolean;
  labelName: boolean;
}

const initialDisplayOptions: DisplayOptions = {
  labelIcon: true,
  colorPreview: true,
  labelName: true
};

const Label: React.FC<{
  label: InternalLabel;
  displayOptions?: DisplayOptions;
}> = props => {
  const { label, displayOptions = initialDisplayOptions } = props;
  return (
    <StyledLabelDiv>
      {displayOptions.colorPreview && (
        <div
          className="color-preview"
          style={{
            backgroundColor: label.data.color,
            color: mostReadable(label.data.color, [
              '#000000',
              '#ffffff'
            ]).toHexString()
          }}
        />
      )}
      {displayOptions.labelIcon && (
        <div className="icon">
          <Icon icon={labelTypes[label.type].icon} />
        </div>
      )}
      {displayOptions.labelName && (
        <div className="caption">
          {label.name ?? <span className="no-name">Label</span>}
        </div>
      )}
    </StyledLabelDiv>
  );
};

const LabelDropdown: React.FC<{
  labels: InternalLabel[];
  onSelect: (labelIndex: number) => void;
  initialLabelIndex?: number;
  displayOptions?: DisplayOptions;
}> = props => {
  const {
    labels,
    onSelect,
    initialLabelIndex = 0,
    displayOptions = initialDisplayOptions
  } = props;
  const [selectedLabel, setSelectedLabel] = useState<InternalLabel>(
    labels[initialLabelIndex]
  );

  return (
    <DropdownButton
      onSelect={type => onSelect(type)}
      bsSize="xs"
      title={<Label label={selectedLabel} displayOptions={displayOptions} />}
      id="label-dropdown"
      noCaret
    >
      {labels.map((label, ind) => {
        return (
          <MenuItem
            key={ind}
            eventKey={ind}
            onClick={() => setSelectedLabel(label)}
          >
            <Label label={label} displayOptions={displayOptions} />
          </MenuItem>
        );
      })}
    </DropdownButton>
  );
};

export default LabelDropdown;
export { Label };

const StyledLabelDiv = styled.div`
  white-space: nowrap;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 3px 0px 3px 0px;
  gap: 0px 15px;
  min-width: 200px;
  .color-preview {
    display: block;
    flex: 0 0 25px;
    height: 20px;
    text-align: center;
    border: 1px solid ${(props: any) => props.theme.border};
  }
  .circus-icon {
    font-size: 130%;
  }
  .caption {
    overflow: hidden;
    text-align: left;
    .no-name {
      color: gray;
    }
  }
  &:hover {
    background-color: ${(props: any) => props.theme.secondaryBackground};
  }
`;
