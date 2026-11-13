import type { Editor } from './processor-types.ts';
import Select from '#components/Select.tsx';
import React from 'react';
import type { IntersliceInterpolationOptions } from './ii-processor.ts';
import styles from './ii-options.module.css';

const orientationOptions = {
  Axial: 'Axial',
  Coronal: 'Coronal',
  Sagital: 'Sagital'
};

const originIsCenterOptions = {
  Single: 'Single',
  Multi: 'Multiple'
};

export const initialOptions: IntersliceInterpolationOptions = {
  orientation: 'Axial',
  mode: 'Multi'
};

export const OptionsEditor: Editor<IntersliceInterpolationOptions> = props => {
  const { value, onChange } = props;
  return (
    <div className={styles.options}>
      Orientation
      <Select
        size="small"
        options={orientationOptions}
        value={value.orientation}
        onChange={v => onChange({ ...value, orientation: v })}
      />
      Mode
      <Select
        size="small"
        options={originIsCenterOptions}
        value={value.mode}
        onChange={v => onChange({ ...value, mode: v })}
      />
    </div>
  );
};
