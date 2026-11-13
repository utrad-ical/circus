import React, { useEffect, useState } from 'react';
import { useCsResults } from '@utrad-ical/circus-ui-kit';
import type { Display } from '@utrad-ical/circus-ui-kit';
import { Field, FieldLabel, TextInput } from './utils/formField.tsx';
import { useErrorMessage } from './utils/useErrorMessage.tsx';

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
   * The minimum length of the input.
   */
  minLength?: number;
  /**
   * Regular expression for validation.
   */
  pattern?: string;
}

/**
 * Text display collects user feedback as a string.
 */
export const Text: Display<TextOptions, string> = props => {
  const { options, initialFeedbackValue, onFeedbackChange, personalOpinions } =
    props;
  const { label, maxLength = 64, minLength, pattern } = options;
  const { consensual, editable } = useCsResults();

  const [currentFeedback, setCurrentFeedback] = useState<string>(() => {
    if (initialFeedbackValue) return String(initialFeedbackValue);
    if (consensual && editable) {
      // Join unique personal opinions
      return Array.from(
        new Set<string>(personalOpinions.map(o => String(o.data))).values()
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
    setInvalidMessage(undefined);
    onFeedbackChange({ valid: true, value: currentFeedback });
  }, [currentFeedback]);

  if (error) return error;

  return (
    <Field>
      <FieldLabel>
        {label}
        <TextInput
          type="text"
          disabled={!editable}
          value={currentFeedback}
          title={invalidMessage}
          aria-invalid={!!invalidMessage}
          onChange={(ev: React.ChangeEvent<HTMLInputElement>) =>
            setCurrentFeedback(ev.target.value)
          }
        />
      </FieldLabel>
    </Field>
  );
};
