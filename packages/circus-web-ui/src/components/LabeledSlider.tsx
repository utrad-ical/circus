import * as et from '@smikitky/rb-components/lib/editor-types';
import Slider, { SliderProps } from '@smikitky/rb-components/lib/Slider';
import React from 'react';
import styled from 'styled-components';

const LabeledSlider: React.FC<
  SliderProps & {
    value: number;
    onChange: (value: number) => void;
    label?: (value: number) => string;
  }
> = props => {
  const { label = value => String(value), ...sliderProps } = props;
  return (
    <StyledDiv>
      <Slider {...sliderProps} />
      <div>{label(props.value)}</div>
    </StyledDiv>
  );
};

const StyledDiv = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;
  > .slider {
    width: 150px;
  }
`;

export const labeledSlider = (options: {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  label?: (value: number) => string;
}): et.Editor<number | undefined> => {
  const { min, max, step, defaultValue, label } = options;
  return props => {
    const { value = defaultValue, onChange } = props;
    return (
      <LabeledSlider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        label={label}
      />
    );
  };
};
