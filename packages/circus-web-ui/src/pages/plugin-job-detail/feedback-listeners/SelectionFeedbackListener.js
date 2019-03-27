import React, { useImperativeHandle } from 'react';
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

const SelectionFeedbackListener = React.forwardRef((props, ref) => {
  const { onChange, isConsensual, value, disabled, options } = props;
  const currentOptions = isConsensual ? options.consensual : options.personal;

  // Exports "methods" for this FB listener
  useImperativeHandle(ref, () => ({
    mergePersonalFeedback: personalFeedback => {
      const votes = new Map();
      const applyConsensualMapsTo = value => {
        const orig = options.personal.find(o => o.value === value);
        if (orig === undefined)
          throw new Error('Unknown personal feedback value');
        if ('consensualMapsTo' in orig) value = orig.consensualMapsTo;
        if (!options.consensual.find(o => o.value === value))
          throw new Error('Unknown consensual feedback value');
        return value;
      };
      personalFeedback.forEach(pfb => {
        const mappedValue = applyConsensualMapsTo(pfb);
        const voteCount = votes.get(mappedValue) || 0;
        votes.set(mappedValue, voteCount + 1);
      });
      if (votes.size !== 1) return undefined;
      return [...votes.keys()][0];
    },
    validate: value => {
      if (value === undefined) return false;
      return currentOptions.some(opt => opt.value === value);
    }
  }));

  return (
    <StyledDiv>
      {currentOptions.map((o, i) => (
        <SelectionButton
          key={i}
          value={value}
          disabled={disabled}
          def={o}
          onClick={() => onChange(o.value)}
        />
      ))}
    </StyledDiv>
  );
});

export default SelectionFeedbackListener;
