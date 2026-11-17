import React, { type FC, useState } from 'react';
import Input, { type InputProps } from './Input.tsx';

const formatNumber = (value: number | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? String(value) : '';

/**
 * An `Input` that edits a number. An empty box means `undefined`.
 * Text that is not a number yet (e.g., "-") stays only in the box,
 * and the box shows the value again when it loses focus.
 */
const NumberInput: FC<
  Omit<InputProps, 'type' | 'value' | 'onChange'> & {
    value: number | undefined;
    onChange: (value: number | undefined) => void;
  }
> = props => {
  const { value, onChange, onFocus, onBlur, ...rest } = props;
  // The text in the box while focused. React reverts a controlled input
  // to its value after each change, so this must hold "-" (seen as "")
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Input
      {...rest}
      type="number"
      value={draft ?? formatNumber(value)}
      onFocus={ev => {
        setDraft(formatNumber(value));
        onFocus?.(ev);
      }}
      onBlur={ev => {
        setDraft(null);
        onBlur?.(ev);
      }}
      onChange={ev => {
        const text = ev.target.value;
        setDraft(text);
        // "-" and the like are not numbers yet
        if (ev.target.validity.badInput) return;
        onChange(text === '' ? undefined : Number(text));
      }}
    />
  );
};

export default NumberInput;
