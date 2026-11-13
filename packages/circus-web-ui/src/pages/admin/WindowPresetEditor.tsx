import Input from '#components/Input.tsx';
import React from 'react';
import styles from './WindowPresetEditor.module.css';

interface WindowAndLabel {
  label: string;
  level: number;
  width: number;
}

/**
 * Renderes a 'window preset' editor with 'label', 'level' and 'width' fields.
 * Used in the "Project Administration" page.
 */
const WindowPresetEditor: React.FC<{
  value: WindowAndLabel;
  onChange: (value: WindowAndLabel) => void;
}> = props => {
  const { onChange, value } = props;

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    let newItemValue: any = ev.target.value;
    if (/level|width/.test(ev.target.name))
      newItemValue = parseFloat(newItemValue);
    const newValue: WindowAndLabel = {
      ...props.value,
      [ev.target.name]: newItemValue
    };
    onChange(newValue);
  };

  return (
    <span className={styles.root}>
      <Input
        value={value.label}
        placeholder="label"
        name="label"
        onChange={handleChange}
      />
      L:
      <Input
        value={value.level}
        type="number"
        placeholder="window level"
        name="level"
        onChange={handleChange}
      />
      W:
      <Input
        value={value.width}
        type="number"
        placeholder="window width"
        name="width"
        onChange={handleChange}
      />
    </span>
  );
};

export default WindowPresetEditor;
