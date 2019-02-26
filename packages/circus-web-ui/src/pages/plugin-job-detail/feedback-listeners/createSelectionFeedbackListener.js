import React from 'react';
import styled from 'styled-components';
import classnames from 'classnames';
import tinycolor from 'tinycolor2';

const StyledDiv = styled.div`
  display: flex;
  justify-content: space-around;
`;

const readableBlackOrWhite = backgroundColor =>
  tinycolor.mostReadable(backgroundColor, ['#ffffff', '#333333']).toHexString();

const StyledButton = styled.button`
  background-color: ${props => props.backgroundColor || '#ffffff'};
  color: ${props => readableBlackOrWhite(props.backgroundColor || '#ffffff')};
  padding: 0.5em 0.2em;
  border: 1px solid #cccccc;
  flex-grow: 1;
  margin: 0 1px;
  &.active {
    background-color: ${props => props.activeColor || props.theme.brandDark};
    color: ${props =>
      readableBlackOrWhite(props.activeColor || props.theme.brandDark)};
  }
  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
`;

const SelectionButton = props => {
  const { value, def, onClick, disabled } = props;
  return (
    <StyledButton
      className={classnames({ active: value === def.value })}
      backgroundColor={props.def.backgroundColor}
      activeColor={props.def.activeColor}
      onClick={onClick}
      disabled={disabled}
    >
      {def.caption || value}
    </StyledButton>
  );
};

const createSelectionFeedbackListener = options => {
  const SelectionFeedbackListener = props => {
    const { onChange, isConsensual, value, canEdit } = props;

    const handleClick = selected => {
      onChange(selected);
    };

    const currentOptions = isConsensual ? options.consensual : options.personal;

    return (
      <StyledDiv>
        {currentOptions.map((o, i) => (
          <SelectionButton
            key={i}
            value={value}
            disabled={!canEdit}
            def={o}
            onClick={() => handleClick(o.value)}
          />
        ))}
      </StyledDiv>
    );
  };
  return SelectionFeedbackListener;
};

export default createSelectionFeedbackListener;
