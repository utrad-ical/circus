import React, { useEffect, useState } from 'react';
import ControlLabel from 'react-bootstrap/lib/ControlLabel';
import FormControl from 'react-bootstrap/lib/FormControl';
import FormGroup from 'react-bootstrap/lib/FormGroup';
import { useCsResults } from '../CsResultsContext';
import { Display } from '../Display';
import { useErrorMessage } from './utils/useErrorMessage';

interface TextOptions {
  /**
   * If set, shows this label (caption) before the input control.
   */
  label?: string;
  /**
   * The maximum length of the input.
   */
  maxLength?: number;
  /**
   * The miniimum length of the input.
   */
  minLength?: number;
  /**
   * Regular expression for validation.
   */
  pattern?: string;
  /**
   * If set to true, casts the returned value using `Number`.
   */
  asNumber?: boolean;
}

/**
 * Text display collects user feedback as string.
 */
export const Text: Display<TextOptions, string | number> = props => {
  const {
    options,
    initialFeedbackValue,
    onFeedbackChange,
    personalOpinions
  } = props;
  const { label, maxLength, minLength, pattern, asNumber } = options;
  const { consensual, editable } = useCsResults();
  const [currentFeedback, setCurrentFeedback] = useState<string>(() => {
    if (initialFeedbackValue) return String(initialFeedbackValue);
    if (consensual && editable) {
      // Join unique personal opinions
      return Array.from(
        new Set<string>(
          ...personalOpinions.map(o => String(o.data) ?? '')
        ).values()
      ).join(', ');
    }
    return '';
  });
  const [invalidMessage, setInvalidMessage] = useState<string>();
  const [error, setError] = useErrorMessage();

  useEffect(() => {
    const invalidate = (message: string) => {
      setInvalidMessage(message);
      onFeedbackChange({ valid: false, error: message });
    };
    if (typeof maxLength === 'number' && currentFeedback.length > maxLength) {
      invalidate(`Too long (max length: ${maxLength})`);
      return;
    }
    if (typeof minLength === 'number' && currentFeedback.length < minLength) {
      invalidate(`Too short (min length: ${maxLength})`);
      return;
    }
    if (typeof pattern === 'string') {
      try {
        const reg = new RegExp(pattern);
        if (!reg.test(currentFeedback)) {
          invalidate('Input does not match the correct pattern');
          return;
        }
      } catch (err) {
        setError('Invalid display strategy. The "pattern" property is wrong.');
      }
    }
    if (asNumber === true && isNaN(Number(currentFeedback))) {
      invalidate('Input a number');
      return;
    }
    setInvalidMessage(undefined);
    onFeedbackChange({
      valid: true,
      value: asNumber === true ? Number(currentFeedback) : currentFeedback
    });
  }, [currentFeedback]);

  if (error) return error;

  return (
    <FormGroup validationState={invalidMessage ? 'error' : undefined}>
      {label && <ControlLabel>{label}</ControlLabel>}
      <FormControl
        type="text"
        disabled={!editable}
        value={currentFeedback}
        title={invalidMessage}
        onChange={(ev: React.BaseSyntheticEvent) =>
          setCurrentFeedback(ev.target.value)
        }
      />
      <FormControl.Feedback />
    </FormGroup>
  );
};
