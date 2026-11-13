import React, { type ReactElement } from 'react';
import styles from './ArrayEditor.module.css';
import Button from './Button.tsx';
import type { Editor } from './editorTypes.tsx';

/**
 * Edits an array with an editor for each item.
 */
const ArrayEditor = <T,>(props: {
  value: T[] | undefined;
  onChange: (value: T[]) => void;
  disabled?: boolean;
  editor: Editor<T>;
  newItemValue: T | ((values: T[]) => T);
}): ReactElement => {
  const { value = [], onChange, disabled, editor: Item, newItemValue } = props;

  const handleChange = (index: number, item: T) => {
    const next = value.slice();
    next[index] = item;
    onChange(next);
  };

  const handleAdd = () => {
    const item =
      newItemValue instanceof Function ? newItemValue(value) : newItemValue;
    onChange([...value, item]);
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <ul className={styles.list}>
      {value.map((item, i) => (
        <li key={i}>
          <div className={styles.item}>
            <Item
              value={item}
              onChange={v => handleChange(i, v)}
              disabled={disabled}
            />
          </div>
          <Button
            variant="link"
            size="xsmall"
            icon="material-close"
            title="Remove"
            disabled={disabled}
            onClick={() => handleRemove(i)}
          />
        </li>
      ))}
      <li>
        <Button
          variant="link"
          size="xsmall"
          icon="material-add"
          disabled={disabled}
          onClick={handleAdd}
        >
          Add
        </Button>
      </li>
    </ul>
  );
};

export default ArrayEditor;
