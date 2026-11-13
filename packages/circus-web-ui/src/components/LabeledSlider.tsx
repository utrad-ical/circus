import type * as et from '#components/editorTypes.tsx';
import type { SliderProps } from '#components/Slider.tsx';
import Slider from '#components/Slider.tsx';
import React from 'react';
import styles from './LabeledSlider.module.css';

const LabeledSlider: React.FC<
  SliderProps & {
    value: number;
    onChange: (value: number) => void;
    label?: (value: number) => string;
  }
> = props => {
  const { label = value => String(value), ...sliderProps } = props;
  return (
    <div className={styles.labeledSlider}>
      <Slider {...sliderProps} className={styles.slider} />
      <div>{label(props.value)}</div>
    </div>
  );
};

export default LabeledSlider;

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
