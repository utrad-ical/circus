import { Editor } from '@smikitky/rb-components/lib/editor-types';
import ShrinkSelect from '@smikitky/rb-components/lib/ShrinkSelect';
import { FormControl } from 'components/react-bootstrap';
import React from 'react';
import { HoleFillingOptions } from './createHfProcessor';
import SettingDialog from './SettingDialog';

const neighborsOptions2D = {
  4: '4-neigobors',
  8: '8-neigobors'
};

const neighborsOptions3D = {
  6: '6-neigobors',
  26: '26-neigobors'
};

const dimensionOptions = {
  2: '2D',
  3: '3D'
};

const orientationOptions = {
  Axial: 'Axial',
  Coronal: 'Coronal',
  Sagital: 'Sagital'
};

const initialOptions = {
  dimension: 2,
  neighbors: 4,
  orientation: 'Axial',
  maximumComponents: 255
};

const OptionsEditorForHF: Editor<HoleFillingOptions> = props => {
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
        Dimension&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={dimensionOptions}
          value={value.dimension}
          onChange={v =>
            onChange({
              ...value,
              dimension: v,
              neighbors:
                v === 2
                  ? value.neighbors in neighborsOptions2D
                    ? value.neighbors
                    : value.neighbors === 6
                    ? 4
                    : 8
                  : value.neighbors in neighborsOptions3D
                  ? value.neighbors
                  : value.neighbors === 4
                  ? 6
                  : 26
            })
          }
          numericalValue
        />
        {value.dimension === 2 && (
          <>
            &ensp;Orientation&nbsp;
            <ShrinkSelect
              bsSize="sm"
              options={orientationOptions}
              value={value.orientation}
              onChange={v => onChange({ ...value, orientation: v })}
            />
          </>
        )}
      </div>
      <div>
        Neighbors to decide same CC&nbsp;
        <ShrinkSelect
          bsSize="sm"
          options={
            value.dimension === 2 ? neighborsOptions2D : neighborsOptions3D
          }
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

const SettingDialogHF: React.FC<{
  processorProgress: { value: number; label: string };
  onHide: () => void;
  onOkClick: (props: HoleFillingOptions) => void;
}> = props => {
  const { processorProgress, onHide, onOkClick } = props;
  return (
    <SettingDialog
      title="Hole filling"
      optionsEditor={OptionsEditorForHF}
      initialOptions={initialOptions}
      processorProgress={processorProgress}
      onHide={onHide}
      onOkClick={onOkClick}
    />
  );
};

export default SettingDialogHF;
