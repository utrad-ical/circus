import { Editor } from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import React from 'react';
import { CclOptions } from './createCCLs';
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
  neighbors: 26
};

const OptionsEditorForCCL: Editor<CclOptions> = props => {
  const { value, onChange } = props;
  return (
    <>
      <label>
        Maximum number of connected components (CCs) to display&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={maximumCCNumOptions}
          value={value.maximumCcNum}
          onChange={v => onChange({ ...value, maximumCcNum: v })}
          numericalValue
        />
      </label>
      <br />
      <label>
        Neighbors to decide same CC&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={neighborsOptions}
          value={value.neighbors}
          onChange={v => onChange({ ...value, neighbors: v })}
          numericalValue
        />
      </label>
    </>
  );
};

const SettingDialogCCL: React.FC<{
  onHide: () => void;
  onOkClick: (props: CclOptions) => void;
}> = props => {
  const { onHide, onOkClick } = props;
  return (
    <SettingDialog
      title="Setting options for connected component labeling (CCL)"
      optionsEditor={OptionsEditorForCCL}
      initialOptions={initialOptions}
      onHide={onHide}
      onOkClick={onOkClick}
    />
  );
};

export default SettingDialogCCL;
