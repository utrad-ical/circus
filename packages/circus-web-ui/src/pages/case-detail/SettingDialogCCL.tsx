import { Editor } from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { FormControl } from 'components/react-bootstrap';
import React from 'react';
import { CclOptions } from './createCclProcessor';
import SettingDialog from './SettingDialog';

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

const initialOptions = {
  maximumCcNum: 2,
  neighbors: 26,
  maximumComponents: 255
};

const OptionsEditorForCCL: Editor<CclOptions> = props => {
  const { value, onChange } = props;
  const onMaximumComponentsChange = (ev: any) => {
    if (ev.target.value < 1 || 2 ** 16 <= ev.target.value) return;
    onChange({
      ...value,
      maximumComponents: Number(ev.target.value)
    });
  };
  return (
    <>
      <div>
        Maximum number of connected components (CCs)&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={maximumCCNumOptions}
          value={value.maximumCcNum}
          onChange={v => onChange({ ...value, maximumCcNum: v })}
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
        Maximum number of tentative label&nbsp;
        <FormControl
          type="number"
          value={value.maximumComponents}
          name="maximumComponents"
          onChange={onMaximumComponentsChange}
        />
      </div>
    </>
  );
};

const SettingDialogCCL: React.FC<{
  processorProgress: { value: number; label: string };
  onHide: () => void;
  onOkClick: (props: CclOptions) => void;
}> = props => {
  const { processorProgress, onHide, onOkClick } = props;
  return (
    <SettingDialog
      title="Connected component labeling (CCL)"
      optionsEditor={OptionsEditorForCCL}
      initialOptions={initialOptions}
      processorProgress={processorProgress}
      onHide={onHide}
      onOkClick={onOkClick}
    />
  );
};

export default SettingDialogCCL;
