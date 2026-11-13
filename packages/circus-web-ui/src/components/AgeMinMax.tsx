import React, { type ChangeEvent, type FC } from 'react';
import styles from './AgeMinMax.module.css';
import Input from './Input.tsx';

const AgeMinMax: FC<{
  value: { min: number; max: number };
  onChange: (value: { min: number; max: number }) => void;
}> = props => {
  const { value, onChange } = props;
  const change = (ev: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, [ev.target.name]: parseInt(ev.target.value, 10) });
  };

  const min = value ? value.min : '';
  const max = value ? value.max : '';

  return (
    <span className={styles.ageMinMax}>
      <Input type="number" value={min} name="min" onChange={change} />
      &mdash;
      <Input type="number" value={max} name="max" onChange={change} />
    </span>
  );
};

export default AgeMinMax;
