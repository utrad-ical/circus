import React, { useImperativeHandle } from 'react';
import styled from 'styled-components';
import classnames from 'classnames';
import { OverlayTrigger, Tooltip } from 'components/react-bootstrap';
import tinycolor from 'tinycolor2';
import { ImperativeFeedbackRef, FeedbackListenerProps } from '../types';

const StyledDiv = styled.div`
  display: flex;
  justify-content: space-around;
`;

const readableBlackOrWhite = (backgroundColor: string) =>
  tinycolor.mostReadable(backgroundColor, ['#ffffff', '#333333']).toHexString();

const StyledButton = styled.button`
  background-color: ${(props: any) => props.backgroundColor || '#ffffff'};
  color: ${(props: any) =>
    readableBlackOrWhite(props.backgroundColor || '#ffffff')};
  padding: 0.5em 0.2em;
  border: 1px solid #cccccc;
  flex-grow: 1;
  margin: 0 1px;
  &.active {
    background-color: ${(props: any) =>
      props.activeColor || props.theme.brandDark};
    color: ${(props: any) =>
      readableBlackOrWhite(props.activeColor || props.theme.brandDark)};
  }
  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
  .label {
    margin-left: 5px;
  }
`;

const SelectionButton: React.FC<{
  value: string | number;
  def: {
    value: string | number;
    backgroundColor: string;
    activeColor: string;
  };
  onClick: () => void;
  disabled?: boolean;
  toolTip: React.ReactNode;
}> = props => {
  const { value, def, onClick, disabled, children, toolTip } = props;
  const button = (
    <StyledButton
      className={classnames({ active: value === def.value })}
      backgroundColor={def.backgroundColor}
      activeColor={def.activeColor}
      onClick={onClick}
      disabled={disabled}
    >
      {children || value}
    </StyledButton>
  );
  if (!toolTip) return button;
  const tip = (
    <Tooltip placelemnt="top" id="icon-display-tooltip">
      {toolTip}
    </Tooltip>
  );
  return (
    <OverlayTrigger overlay={tip} placement="bottom">
      {button}
    </OverlayTrigger>
  );
};

interface BasicChoiceOptions {
  value: any;
  caption: string;
  backgroundColor: string;
  activeColor: string;
}

const SelectionFeedbackListener = React.forwardRef<
  any,
  FeedbackListenerProps<
    string | number,
    {
      personal: (BasicChoiceOptions & { consensualMapsTo: string | number })[];
      consensual: BasicChoiceOptions[];
    }
  >
>((props, ref) => {
  const {
    onChange,
    isConsensual,
    value,
    personalOpinions,
    disabled,
    options
  } = props;
  const currentOptions = isConsensual ? options.consensual : options.personal;

  const applyConsensualMapsTo = (value: string | number) => {
    const orig = options.personal.find(o => o.value === value);
    if (orig === undefined) throw new Error('Unknown personal feedback value');
    if ('consensualMapsTo' in orig) value = orig.consensualMapsTo;
    if (!options.consensual.find(o => o.value === value))
      throw new Error('Unknown consensual feedback value');
    return value;
  };

  // Exports "methods" for this FB listener
  useImperativeHandle<any, ImperativeFeedbackRef<string | number>>(ref, () => ({
    mergePersonalFeedback: personalFeedback => {
      const votes = new Map();
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
      {currentOptions.map((def, i) => {
        const voters = isConsensual
          ? personalOpinions!.filter(
              f => applyConsensualMapsTo(f.data) === def.value
            )
          : [];
        const toolTip = voters.length
          ? voters.map(f => f.userEmail).join(', ')
          : undefined;
        return (
          <SelectionButton
            key={i}
            value={value}
            disabled={disabled}
            def={def}
            onClick={() => onChange(def.value)}
            toolTip={toolTip}
          >
            {def.caption}
            {isConsensual && voters.length > 0 && (
              <span className="label label-default">{voters.length}</span>
            )}
          </SelectionButton>
        );
      })}
    </StyledDiv>
  );
});

export default SelectionFeedbackListener;
