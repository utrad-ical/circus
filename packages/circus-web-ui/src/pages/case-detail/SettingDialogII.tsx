import { Editor } from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import React from 'react';
import { IntersliceInterpolationOptions } from './createIiProcessor';
import SettingDialog from './SettingDialog';

const orientationOptions = {
  Axial: 'Axial',
  Coronal: 'Coronal',
  Sagital: 'Sagital'
};

const initialOptions = {
  orientation: 'Axial'
};

const OptionsEditorForII: Editor<IntersliceInterpolationOptions> = props => {
  const { value, onChange } = props;
  return (
    <>
      <div>
        Orientation&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={orientationOptions}
          value={value.orientation}
          onChange={v => onChange({ ...value, orientation: v })}
        />
      </div>
    </>
  );
};

const SettingDialogII: React.FC<{
  processorProgress: { value: number; label: string };
  onHide: () => void;
  onOkClick: (props: IntersliceInterpolationOptions) => void;
}> = props => {
  const { processorProgress, onHide, onOkClick } = props;

  return (
    <SettingDialog
      title="Interslice Interpolation"
      optionsEditor={OptionsEditorForII}
      initialOptions={initialOptions}
      processorProgress={processorProgress}
      onHide={onHide}
      onOkClick={onOkClick}
    />
  );
};

export default SettingDialogII;
