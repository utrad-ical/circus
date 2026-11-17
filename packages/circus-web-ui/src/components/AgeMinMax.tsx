import React, { type FC } from 'react';
import styles from './AgeMinMax.module.css';
import NumberInput from './NumberInput.tsx';

type AgeRange = { min?: number; max?: number };

/**
 * Edits the range of age. An empty box means no limit.
 */
const AgeMinMax: FC<{
  value: AgeRange;
  onChange: (value: AgeRange) => void;
}> = props => {
  const { value, onChange } = props;

  return (
    <span className={styles.ageMinMax}>
      <NumberInput
        name="min"
        min={0}
        value={value?.min}
        onChange={min => onChange({ ...value, min })}
      />
      &mdash;
      <NumberInput
        name="max"
        min={0}
        value={value?.max}
        onChange={max => onChange({ ...value, max })}
      />
    </span>
  );
};

export default AgeMinMax;
