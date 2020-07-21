import React from 'react';

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
    <span className="window-preset-editor form-inline">
      <input
        className="form-control"
        value={value.label}
        placeholder="label"
        name="label"
        onChange={handleChange}
      />
      &nbsp;L:&nbsp;
      <input
        className="form-control"
        value={value.level}
        type="number"
        placeholder="window level"
        name="level"
        onChange={handleChange}
      />
      &nbsp;W:&nbsp;
      <input
        className="form-control"
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
