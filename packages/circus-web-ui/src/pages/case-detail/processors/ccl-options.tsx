import { Editor } from './processor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { FormControl } from 'components/react-bootstrap';
import React from 'react';
import { CclOptions } from './ccl-processor';

const maximumCCNumOptions = {
  1: '1 CC',
  2: '2 CCs',
  3: '3 CCs',
  4: '4 CCs',
  5: '5 CCs',
  6: '6 CCs',
  7: '7 CCs',
  8: '8 CCs',
  9: '9 CCs',
  10: '10 CCs'
};

const neighborsOptions = {
  6: '6-neigobors',
  26: '26-neigobors'
};

export const initialOptions: CclOptions = {
  maxOutputComponents: 2,
  neighbors: 26,
  bufferSize: 255
};

export const OptionsEditor: Editor<CclOptions> = props => {
  const { value, onChange } = props;
  const onMaximumComponentsChange = (ev: any) => {
    if (ev.target.value < 1 || 2 ** 16 <= ev.target.value) return;
    onChange({
      ...value,
      bufferSize: Number(ev.target.value)
    });
  };
  return (
    <>
      <div>
        Maximum number of connected components (CCs)&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={maximumCCNumOptions}
          value={value.maxOutputComponents}
          onChange={v => onChange({ ...value, maxOutputComponents: v })}
          numericalValue
        />
      </div>
      <div>
        Neighbors to decide same CC&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={neighborsOptions}
          value={value.neighbors}
          onChange={v => onChange({ ...value, neighbors: v })}
          numericalValue
        />
      </div>
      <div className="maximum-number-of-tentative-label form-inline">
        Maximum number of tentative labels&nbsp;
        <FormControl
          type="number"
          value={value.bufferSize}
          name="bufferSize"
          onChange={onMaximumComponentsChange}
        />
      </div>
    </>
  );
};
