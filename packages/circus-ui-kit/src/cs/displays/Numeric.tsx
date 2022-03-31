import React, { useEffect, useState } from 'react';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { useErrorMessage } from './utils/useErrorMessage';

interface NumberOptions {
  label?: string;
  integer?: boolean;
  minimum?: number;
  exclusiveMinimum?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  default?: number;
}

/**
 * Numeric display collect user feedback as a number.
 */
export const Numeric: Display<NumberOptions, number> = props => {
  const { options, initialFeedbackValue, onFeedbackChange, personalOpinions } =
    props;
  const {
    label,
    minimum,
    exclusiveMinimum,
    maximum,
    exclusiveMaximum,
    multipleOf,
    default: defaultValue = 0
  } = options;
  const { consensual, editable } = useCsResults();

  const [inputText, setInputText] = useState<number>(() => {
    if (initialFeedbackValue) return initialFeedbackValue;
    if (consensual && editable) {
      // Calculate mean
      const sum = personalOpinions
        .map(o => Number(o.data) ?? 0)
        .reduce((a, b) => a + b, 0);
      return sum / personalOpinions.length;
    }
    return defaultValue;
  });
  const [invalidMessage, setInvalidMessage] = useState<string>();
  const [error, setError] = useErrorMessage();

  const handleChange = (ev: React.BaseSyntheticEvent) => {
    setInputText(ev.target.value);
  };

  useEffect(() => {
    const invalidate = (message: string) => {
      setInvalidMessage(message);
      onFeedbackChange({ valid: false, error: message });
    };
    const inputNum = Number(inputText);
    if (isNaN(inputNum)) {
      invalidate('Input a number.');
      return;
    }
    const typeCheck: (
      input: unknown,
      name: string
    ) => asserts input is number | undefined = (input, name) => {
      if (typeof input !== 'undefined' && typeof input !== 'number')
        throw new Error(
          `Invalid display strategy. The value of "${name}" must be a number.`
        );
    };
    try {
      typeCheck(minimum, 'minimum');
      typeCheck(exclusiveMinimum, 'exclusiveMinimum');
      typeCheck(maximum, 'maximum');
      typeCheck(exclusiveMaximum, 'exclusiveMaximum');
      typeCheck(multipleOf, 'multipleOf');
    } catch (err: any) {
      setError(err.message);
      return;
    }

    if (typeof minimum === 'number' && inputNum < minimum) {
      invalidate(`The input must be larger than or equal to ${minimum}.`);
      return;
    }
    if (typeof exclusiveMinimum === 'number' && inputNum <= exclusiveMinimum) {
      invalidate(`The input must be larger than ${exclusiveMinimum}.`);
      return;
    }
    if (typeof maximum === 'number' && inputNum > maximum) {
      invalidate(`The input must be smaller than or equal to ${maximum}.`);
      return;
    }
    if (typeof exclusiveMaximum === 'number' && inputNum >= exclusiveMaximum) {
      invalidate(`The input must be smaller than ${minimum}.`);
      return;
    }
    if (typeof multipleOf === 'number' && inputNum % multipleOf !== 0) {
      invalidate(
        multipleOf === 1
          ? 'The input must be an integer.'
          : `The input must be a multiple of ${multipleOf}.`
      );
      return;
    }
    setInvalidMessage(undefined);
    onFeedbackChange({ valid: true, value: inputNum });
  }, [inputText]);

  if (error) return error;

  return (
    <FormGroup validationState={invalidMessage ? 'error' : undefined}>
      {label && <ControlLabel>{label}</ControlLabel>}
      <FormControl
        type="text"
        disabled={!editable}
        value={inputText}
        title={invalidMessage}
        onChange={handleChange}
      />
      <FormControl.Feedback />
    </FormGroup>
  );
};
