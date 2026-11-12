import Button from '#components/Button.tsx';
import { ColorPalette } from '@smikitky/rb-components/lib/ColorPicker';
import type * as et from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import React, { useState } from 'react';
import styled from 'styled-components';
import { defaultLabelColors } from '../labelColors.ts';
import type { LabelColorsSettings } from '../store/loginUser.ts';

const LabelColorsEditor: et.Editor<LabelColorsSettings | undefined> = props => {
  const { value, onChange } = props;
  const [activeColor, setActiveColor] = useState('');
  const [editingColor, setEditingColor] = useState('#ff0000');

  if (value === undefined) return null;

  const handleLabelColorsSelect = (colorsType: string) => {
    onChange({ ...value, useDefault: colorsType === 'default' });
  };

  const handleColorSelect = (color: string) => {
    setActiveColor(color);
    setEditingColor(color);
  };

  const canNotAdd = () => {
    return (
      value.useDefault ||
      value.customColors.some(color => color === editingColor)
    );
  };

  const canNotDelete = () => {
    return (
      value.useDefault ||
      !value.customColors ||
      value.customColors.length < 2 ||
      !value.customColors.some(color => color === activeColor)
    );
  };

  const canNotChange = () => {
    return (
      value.useDefault ||
      !value.customColors ||
      !value.customColors.some(color => color === activeColor) ||
      value.customColors.some(color => color === editingColor)
    );
  };

  const handleAdd = () => {
    onChange({
      ...value,
      customColors: [...value.customColors, editingColor]
    });
  };

  const handleChange = () => {
    const pos = value.customColors.findIndex(color => color === activeColor);
    onChange({
      ...value,
      customColors: value.customColors.map((color, ind) =>
        ind === pos ? editingColor : color
      )
    });
  };

  const handleDelete = () => {
    onChange({
      ...value,
      customColors: value.customColors.filter(color => color !== activeColor)
    });
  };
  return (
    <StyledDiv>
      <ShrinkSelect
        bsSize="sm"
        options={{ default: 'Default', custom: 'Custom' }}
        value={value.useDefault ? 'default' : 'custom'}
        onChange={handleLabelColorsSelect}
      />
      <ColorPalette
        value={activeColor}
        colors={value.useDefault ? defaultLabelColors : value.customColors}
        onChange={handleColorSelect}
      />
      {!value.useDefault && (
        <>
          <input
            type="color"
            value={editingColor}
            onChange={ev => setEditingColor(ev.target.value)}
          />
          <Button
            size="small"
            variant="primary"
            disabled={canNotAdd()}
            onClick={handleAdd}
          >
            Add
          </Button>
          <Button
            size="small"
            variant="primary"
            disabled={canNotChange()}
            onClick={handleChange}
          >
            Change
          </Button>
          <Button
            size="small"
            variant="primary"
            disabled={canNotDelete()}
            onClick={handleDelete}
          >
            Deleate
          </Button>
        </>
      )}
    </StyledDiv>
  );
};

export default LabelColorsEditor;

const StyledDiv = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
  .color-picker-palette > .color-picker-palette-color.selected {
    outline: solid 2px var(--circus-highlight-color);
  }
`;
