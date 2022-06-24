import { ColorPalette } from '@smikitky/rb-components/lib/ColorPicker';
import * as et from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { Button } from 'components/react-bootstrap';
import React, { useState } from 'react';
import styled from 'styled-components';
import { defaultLabelColors } from '../labelColors';

const LabelColorsSelector: et.Editor<
  { default: boolean; customColors: string[] } | undefined
> = props => {
  const { value, onChange } = props;
  const [activeColor, setActiveColor] = useState('');
  const [futureColor, setFutureColor] = useState('#ff0000');

  const handleLabelColorsSelect = (colorsType: string) => {
    value
      ? onChange({ ...value, default: colorsType === 'default' })
      : onChange({ default: colorsType === 'default', customColors: [] });
  };
  const handleColorSelect = (color: string) => {
    setActiveColor(color);
    setFutureColor(color);
  };

  const canNotAdd = () => {
    return (
      !value ||
      value.default ||
      value.customColors.some(color => color === futureColor)
    );
  };
  const canNotDelete = () => {
    return (
      !value ||
      value.default ||
      !value.customColors ||
      value.customColors.length < 2 ||
      !value.customColors.some(color => color === activeColor)
    );
  };
  const canNotChange = () => {
    return (
      !value ||
      value.default ||
      !value.customColors ||
      !value.customColors.some(color => color === activeColor) ||
      value.customColors.some(color => color === futureColor)
    );
  };
  const handleAdd = () => {
    value &&
      onChange({
        ...value,
        customColors: [...value.customColors, futureColor]
      });
  };
  const handleChange = () => {
    if (value) {
      const pos = value.customColors.findIndex(color => color === activeColor);
      onChange({
        ...value,
        customColors: value.customColors.map((color, ind) =>
          ind === pos ? futureColor : color
        )
      });
    }
  };
  const handleDelete = () => {
    value &&
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
        value={!value || value.default ? 'default' : 'custom'}
        onChange={handleLabelColorsSelect}
      />
      <ColorPalette
        value={activeColor}
        colors={
          !value || value.default ? defaultLabelColors : value.customColors
        }
        onChange={handleColorSelect}
      />
      {value && !value.default && (
        <>
          <input
            type="color"
            value={futureColor}
            onChange={ev => setFutureColor(ev.target.value)}
          />
          <Button bsStyle="primary" disabled={canNotAdd()} onClick={handleAdd}>
            Add
          </Button>
          <Button
            bsStyle="primary"
            disabled={canNotChange()}
            onClick={handleChange}
          >
            Change
          </Button>
          <Button
            bsStyle="primary"
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

export default LabelColorsSelector;

const StyledDiv = styled.div`
  display: flex;
  gap: 5px;
  align-items: center;
`;
