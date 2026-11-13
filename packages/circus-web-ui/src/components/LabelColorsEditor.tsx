import Button from '#components/Button.tsx';
import { ColorPalette } from '#components/ColorPicker.tsx';
import type * as et from '#components/editorTypes.tsx';
import Select from '#components/Select.tsx';
import React, { useState } from 'react';
import { defaultLabelColors } from '../labelColors.ts';
import type { LabelColorsSettings } from '../store/loginUser.ts';
import styles from './LabelColorsEditor.module.css';

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
    <div className={styles.labelColorsEditor}>
      <Select
        size="small"
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
    </div>
  );
};

export default LabelColorsEditor;
