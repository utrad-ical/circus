import React, { type FC } from 'react';
import ArrayEditor from './ArrayEditor.tsx';
import styles from './editorTypes.module.css';
import Input, { type InputProps } from './Input.tsx';

/**
 * A component to edit a value, used with `PropertyEditor` and `arrayOf`.
 * Other editors are made by `selectEditor`, `multiSelectEditor`, etc.
 */
export type Editor<T> = FC<{
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}>;

type InputOptions = Omit<
  InputProps,
  'type' | 'value' | 'onChange' | 'disabled'
>;

const input = <T,>(
  type: string,
  options: InputOptions,
  parse: (input: string) => T
): Editor<T> => {
  const InputEditor: Editor<T> = props => {
    const { value, onChange, disabled } = props;
    return (
      <Input
        {...options}
        type={type}
        value={value === undefined || value === null ? '' : String(value)}
        onChange={ev => onChange(parse(ev.target.value))}
        disabled={disabled}
      />
    );
  };
  return InputEditor;
};

export const text = (options: InputOptions = {}) =>
  input<string>('text', options, s => s);

export const password = (options: InputOptions = {}) =>
  input<string>('password', options, s => s);

export const number = (options: InputOptions = {}) =>
  input<number>('number', options, parseFloat);

export const checkbox = (options: { label?: string } = {}): Editor<boolean> => {
  const CheckboxEditor: Editor<boolean> = props => {
    const { value, onChange, disabled } = props;
    return (
      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={ev => onChange(ev.target.checked)}
          disabled={disabled}
        />
        {options.label}
      </label>
    );
  };
  return CheckboxEditor;
};

/**
 * Turns an editor into the editor of an array of the values.
 */
export const arrayOf = <T,>(
  editor: Editor<T>,
  newItemValue: T | ((values: T[]) => T)
): Editor<T[]> => {
  const ArrayOfEditor: Editor<T[]> = props => {
    const { value, onChange, disabled } = props;
    return (
      <ArrayEditor<T>
        editor={editor}
        newItemValue={newItemValue}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  };
  return ArrayOfEditor;
};
