import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';

interface ButtonDefinition {
  value: number;
  caption: string;
  color?: string;
}

interface PersonalButtonDefinition extends ButtonDefinition {
  consensualMapsTo?: number;
}

interface ToggleButtonsOptions {
  personalButtons: (string | PersonalButtonDefinition)[];
  consensualButtons: (string | ButtonDefinition)[];
}

const normalizeButtonOption = (
  def: string | ButtonDefinition,
  index: number
): ButtonDefinition => {
  return typeof def === 'string' ? { value: index, caption: def } : def;
};

export const ToggleButtonsBase: Display<
  never, // Displays no content from plug-in results data
  ToggleButtonsOptions,
  number
> = props => {
  const {
    initialFeedbackValue,
    personalOpinions,
    onFeedbackChange,
    onFeedbackValidate,
    options: { personalButtons, consensualButtons }
  } = props;
  const { consensual, editable } = useCsResults();

  const buttons = useMemo(
    () =>
      (consensual ? consensualButtons : personalButtons).map(
        normalizeButtonOption
      ),
    [consensual]
  );

  const personalCounts = useMemo<Map<number, number>>(() => {
    const counts = new Map<number, number>();
    if (!consensual) return counts;
    personalOpinions.forEach(p => {
      const pdef = personalButtons
        .map(normalizeButtonOption)
        .find(def => p.feedback == def.value) as PersonalButtonDefinition;
      const fb = pdef?.consensualMapsTo ?? p.feedback;
      return counts.set(fb, (counts.get(fb) ?? 0) + 1);
    });
    return counts;
  }, [personalOpinions]);

  const [selected, setSelected] = useState<number | undefined>(() => {
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

  const handleSelect = (selection: number) => {
    setSelected(selection);
    onFeedbackChange(selection);
  };

  return (
    <span className="list">
      {buttons.map(btn => (
        <button
          onClick={() => handleSelect(btn.value)}
          className={classNames({ selected: btn.value === selected })}
          disabled={!editable}
        >
          {(personalCounts.get(btn.value) ?? 0) > 0 && (
            <span className="opinions">{personalCounts.get(btn.value)}</span>
          )}
          {btn.caption}
        </button>
      ))}
    </span>
  );
};

export const ToggleButton = styled(ToggleButtonsBase)`
  .list {
    display: flex;
  }

  .opinions {
    border: 1px solid gray;
    border-radius: 5px;
    font-size: 80%;
    margin-right: 3px;
  }

  button {
    border: 1px solid black;
    background-color: ${(props: any) => props.theme.background};
    &.selected {
      background-color: ${(props: any) => props.theme.brandPrimary};
    }
    &:hover {
      filter: brightness(80%);
    }
    &:disabled {
      opacity: 0.5;
    }
  }
`;
