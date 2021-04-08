import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';

interface Choice {
  value: number | string;
  caption: string;
  color?: string;
}

interface PersonalChoice extends Choice {
  consensualMapsTo?: number | string;
}

interface ChoiceOptions {
  ui?: 'toggleButtons' | 'dropdown';
  multiple?: boolean;
  personal: (string | PersonalChoice)[];
  consensual: (string | Choice)[];
}

const normalizeChoiceOption = (def: string | Choice, index: number): Choice => {
  return typeof def === 'string' ? { value: index, caption: def } : def;
};

export const Choice: Display<ChoiceOptions, string | number> = props => {
  const {
    initialFeedbackValue,
    personalOpinions,
    onFeedbackChange,
    onFeedbackValidate,
    options: { personal: personalButtons, consensual: consensualButtons }
  } = props;
  const { consensual, editable, job } = useCsResults();

  const buttons = useMemo(
    () =>
      (consensual ? personalButtons : consensualButtons).map(
        normalizeChoiceOption
      ),
    [consensual]
  );

  const personalCounts = useMemo(() => {
    const counts = new Map<string | number, number>();
    if (!consensual) return counts;
    personalOpinions.forEach(p => {
      const pdef = personalButtons
        .map(normalizeChoiceOption)
        .find(def => p.data == def.value) as PersonalChoice;
      const fb = pdef?.consensualMapsTo ?? p.data;
      return counts.set(fb, (counts.get(fb) ?? 0) + 1);
    });
    return counts;
  }, [personalOpinions]);

  const [selected, setSelected] = useState<string | number | undefined>(() => {
    if (!consensual) return initialFeedbackValue;
    // If all personal feedbacks agree, preselect it
    if (personalCounts.size === 1) return Array.from(personalCounts.keys())[0];
    return undefined;
  });

  useEffect(() => {
    // Reports the validation status
    const valid =
      typeof selected === 'number' &&
      buttons.find(def => def.value === selected) !== undefined;
    onFeedbackValidate(valid);
  }, [selected]);

  const handleSelect = (selection: string | number) => {
    setSelected(selection);
    onFeedbackChange(selection);
  };

  const UI: ChoiceUI = ToggleButtons;

  return (
    <div>
      <UI
        choices={buttons}
        onSelect={handleSelect}
        opinions={personalCounts}
        selected={selected}
        disabled={!editable}
      />
    </div>
  );
};

type ChoiceUI = React.FC<{
  choices: Choice[];
  onSelect: (value: string | number) => void;
  opinions?: Map<string | number, number>;
  selected: string | number | undefined;
  disabled: boolean;
}>;

const Button: React.FC<{
  caption: string;
  color?: string;
  selected: boolean;
  disabled: boolean;
  count?: number;
  onClick: React.MouseEventHandler;
}> = props => {
  const { caption, color, selected, disabled, count, onClick } = props;
  return (
    <StyledButton
      color={color}
      onClick={onClick}
      disabled={disabled}
      className={classNames({ selected })}
    >
      {typeof count === 'number' && <span className="opinions">{count}</span>}
      {caption}
    </StyledButton>
  );
};

const StyledButton = styled.button`
  padding: 5px;
  border: 1px solid gray;
  background-color: ${(props: any) => props.theme.background ?? 'transparent'};
  color: ${(props: any) => props.color ?? props.theme.brandPrimary};
  &.selected {
    background-color: ${(props: any) =>
      props.color ?? props.theme.brandPrimary};
    color: ${(props: any) => props.theme.background ?? 'white'};
  }
  &:hover {
    filter: brightness(80%);
  }
  &:disabled {
    opacity: 0.5;
  }
  .opinions {
    border: 1px solid gray;
    border-radius: 5px;
    font-size: 80%;
    margin-right: 3px;
  }
`;

const ToggleButtons: ChoiceUI = props => {
  const { choices, onSelect, opinions, selected, disabled } = props;
  return (
    <StyledDiv>
      {choices.map(choice => (
        <Button
          key={choice.value}
          onClick={() => onSelect(choice.value)}
          disabled={disabled}
          color={choice.color}
          caption={choice.caption}
          selected={choice.value === selected}
          count={
            (opinions?.get(choice.value) ?? 0) > 0
              ? opinions!.get(choice.value)!
              : undefined
          }
        />
      ))}
    </StyledDiv>
  );
};

export const StyledDiv = styled.div`
  display: flex;
  gap: 2px;
`;
