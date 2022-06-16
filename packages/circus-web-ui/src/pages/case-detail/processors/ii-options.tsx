import { Editor } from './processor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import React from 'react';
import { IntersliceInterpolationOptions } from './ii-processor';

const orientationOptions = {
  Axial: 'Axial',
  Coronal: 'Coronal',
  Sagital: 'Sagital'
};

export const initialOptions: IntersliceInterpolationOptions = {
  orientation: 'Axial'
};

export const OptionsEditor: Editor<IntersliceInterpolationOptions> = props => {
  const { value, onChange } = props;
  return (
    <div>
      Orientation&nbsp;
      <ShrinkSelect
        bsSize="sm"
        options={orientationOptions}
        value={value.orientation}
        onChange={v => onChange({ ...value, orientation: v })}
      />
    </div>
  );
};
