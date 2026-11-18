import Button from '#components/Button.tsx';
import { ColorPalette } from '#components/ColorPicker.tsx';
import type * as et from '#components/editorTypes.tsx';
import Select from '#components/Select.tsx';
import React, { useState } from 'react';
import { defaultLabelColors } from '../labelColors.ts';
import type { UserPreferences } from '@utrad-ical/circus-api-schema';
import styles from './LabelColorsEditor.module.css';

const LabelColorsEditor: et.Editor<
  NonNullable<UserPreferences['labelColors']> | undefined
> = props => {
  const { value, onChange } = props;
  const [activeColor, setActiveColor] = useState('');
  const [editingColor, setEditingColor] = useState('#ff0000');

  if (value === undefined) return null;
  const customColors = value.customColors ?? [];

  const handleLabelColorsSelect = (colorsType: string) => {
    onChange({ ...value, useDefault: colorsType === 'default' });
  };

  const handleColorSelect = (color: string) => {
    setActiveColor(color);
    setEditingColor(color);
  };

  const canNotAdd = () => {
    return (
      value.useDefault || customColors.some(color => color === editingColor)
    );
  };

  const canNotDelete = () => {
    return (
      value.useDefault ||
      customColors.length < 2 ||
      !customColors.some(color => color === activeColor)
    );
  };

  const canNotChange = () => {
    return (
      value.useDefault ||
      !customColors.some(color => color === activeColor) ||
      customColors.some(color => color === editingColor)
    );
  };

  const handleAdd = () => {
    onChange({
      ...value,
      customColors: [...customColors, editingColor]
    });
  };

  const handleChange = () => {
    const pos = customColors.findIndex(color => color === activeColor);
    onChange({
      ...value,
      customColors: customColors.map((color, ind) =>
        ind === pos ? editingColor : color
      )
    });
  };

  const handleDelete = () => {
    onChange({
      ...value,
      customColors: customColors.filter(color => color !== activeColor)
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
        colors={value.useDefault ? defaultLabelColors : customColors}
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
