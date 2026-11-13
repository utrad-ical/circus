import Input from '#components/Input.tsx';
import React from 'react';
import styled from 'styled-components';

interface WindowAndLabel {
  label: string;
  level: number;
  width: number;
}

const StyledSpan = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25em;
  input[type='number'] {
    width: 7em;
  }
`;

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
    <StyledSpan>
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
    </StyledSpan>
  );
};

export default WindowPresetEditor;
